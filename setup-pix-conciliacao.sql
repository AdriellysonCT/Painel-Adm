-- ============================================
-- SETUP: Integração PIX Real + Conciliação + Dashboard
-- Data: 01/03/2026
-- ============================================

-- 1. Criar ENUMs para controle operacional do PIX
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_pix_enum') THEN
        CREATE TYPE status_pix_enum AS ENUM (
          'CRIADO',
          'AGUARDANDO_PAGAMENTO',
          'PAGO',
          'FALHOU',
          'CANCELADO',
          'CONCILIADO'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pix_enum') THEN
        CREATE TYPE tipo_pix_enum AS ENUM (
          'RECEBIMENTO_CLIENTE',
          'PAGAMENTO_ENTREGADOR',
          'PAGAMENTO_RESTAURANTE'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Tabela: pix_transacoes
-- Registro de toda interação externa com provedores de pagamento (PSP)
CREATE TABLE IF NOT EXISTS pix_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_pix_enum NOT NULL,
  conta_id UUID REFERENCES contas_contabeis(id),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  status status_pix_enum DEFAULT 'CRIADO',
  provider TEXT, -- ex: 'Asaas', 'Inter', 'Iugu'
  provider_transaction_id TEXT,
  txid TEXT UNIQUE NOT NULL, -- Identificador único do PIX (obrigatório para conciliação)
  payload JSONB DEFAULT '{}', -- Log da resposta bruta do banco/webhook
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE pix_transacoes ENABLE ROW LEVEL SECURITY;

-- 3. Atualizar função inserir_lancamento_seguro para suportar referência externa
-- (Necessário para a automação da conciliação)
CREATE OR REPLACE FUNCTION inserir_lancamento_seguro(
  p_origem UUID,
  p_destino UUID,
  p_valor NUMERIC,
  p_tipo tipo_lancamento_enum,
  p_referencia_externa TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Governança: Apenas admins autorizados podem processar lançamentos
  -- (Nota: Funções internas que chamam esta função rodam como SECURITY DEFINER)
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('SUPER_ADMIN','FINANCEIRO')
  ) THEN
    -- Permitir bypass se for chamado internamente por outra função do sistema (sem auth.uid)
    -- Mas se houver um usuário logado, ele deve ser admin.
    RAISE EXCEPTION 'Permissão Financeira Negada.';
  END IF;

  INSERT INTO ledger_lancamentos (
    conta_origem_id,
    conta_destino_id,
    valor,
    tipo,
    status,
    criado_por_admin_id,
    referencia_externa
  )
  VALUES (
    p_origem,
    p_destino,
    p_valor,
    p_tipo,
    'CONFIRMADO',
    auth.uid(),
    p_referencia_externa
  );
END;
$$;

-- 4. Função: Registrar PIX Recebido (Ponto de entrada do Webhook)
CREATE OR REPLACE FUNCTION registrar_pix_recebido(
  p_txid TEXT,
  p_valor NUMERIC,
  p_provider TEXT,
  p_payload JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Permite atualizar tabelas protegidas e inserir no ledger
AS $$
DECLARE
  v_conta_origem UUID; 
  v_conta_plataforma UUID;
  v_pix_status status_pix_enum;
BEGIN
  -- 4.1 Localizar conta da plataforma
  SELECT id INTO v_conta_plataforma FROM contas_contabeis WHERE tipo = 'PLATAFORMA' LIMIT 1;
  
  -- 4.2 Localizar transação PIX e seu status atual
  SELECT status INTO v_pix_status FROM pix_transacoes WHERE txid = p_txid;
  
  IF v_pix_status IS NULL THEN
    RAISE EXCEPTION 'Erro: Transação PIX com txid % não encontrada.', p_txid;
  END IF;
  
  IF v_pix_status = 'PAGO' OR v_pix_status = 'CONCILIADO' THEN
    RETURN; -- Evitar processamento duplicado (idempotência de rede)
  END IF;

  -- 4.3 Atualizar status da transação externa
  UPDATE pix_transacoes
  SET status = 'PAGO',
      provider = p_provider,
      payload = p_payload,
      atualizado_em = NOW()
  WHERE txid = p_txid;

  -- 4.4 Gerar lançamento de ajuste de saldo na conta plataforma (Dinheiro real entrou)
  -- Como é um recebimento externo, a origem contábil é NULL (Dinheiro vindo de fora do sistema)
  PERFORM inserir_lancamento_seguro(
    NULL,
    v_conta_plataforma,
    p_valor,
    'AJUSTE_MANUAL',
    p_txid -- Vincula o lançamento do ledger ao txid do PIX
  );

END;
$$;

-- 5. Função: Conciliação Automática
CREATE OR REPLACE FUNCTION conciliar_pix()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar como conciliado tudo que foi PAGO e já possui registro correspondente no Ledger
  UPDATE pix_transacoes p
  SET status = 'CONCILIADO',
      atualizado_em = NOW()
  WHERE p.status = 'PAGO'
  AND EXISTS (
    SELECT 1 FROM ledger_lancamentos l
    WHERE l.referencia_externa = p.txid
    AND l.status = 'CONFIRMADO'
  );
END;
$$;

-- 6. Dashboard Executivo Financeiro (Real-time View)
CREATE OR REPLACE VIEW dashboard_financeiro AS
SELECT
  COUNT(*) AS total_transacoes,
  COUNT(*) FILTER (WHERE status = 'PAGO' OR status = 'CONCILIADO') AS pix_pagos,
  SUM(valor) FILTER (WHERE status = 'PAGO' OR status = 'CONCILIADO') AS total_recebido,
  COUNT(*) FILTER (WHERE status = 'FALHOU') AS falhas,
  COUNT(*) FILTER (WHERE status = 'AGUARDANDO_PAGAMENTO') AS aguardando_pagamento,
  SUM(valor) FILTER (WHERE status = 'AGUARDANDO_PAGAMENTO') AS volume_pendente
FROM pix_transacoes;

-- 7. Governança e RLS
-- Admins Financeiros vêem todas as transações PIX
DROP POLICY IF EXISTS admin_select_pix ON pix_transacoes;
CREATE POLICY admin_select_pix
ON pix_transacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('SUPER_ADMIN', 'FINANCEIRO')
  )
);

-- Usuários (Entregadores/Restaurantes) vêem apenas seus próprios logs de PIX
DROP POLICY IF EXISTS usuario_select_proprio_pix ON pix_transacoes;
CREATE POLICY usuario_select_proprio_pix
ON pix_transacoes
FOR SELECT
TO authenticated
USING (
  conta_id IN (SELECT id FROM contas_contabeis WHERE referencia_id = auth.uid())
);

-- Bloqueio de inserção direta por RLS (Integridade via API)
DROP POLICY IF EXISTS block_direct_pix_management ON pix_transacoes;
CREATE POLICY block_direct_pix_management
ON pix_transacoes
FOR INSERT OR UPDATE OR DELETE
TO authenticated
WITH CHECK (false);

-- 8. Indices de Escala e PSP
CREATE INDEX IF NOT EXISTS idx_pix_status ON pix_transacoes(status);
CREATE INDEX IF NOT EXISTS idx_pix_provider ON pix_transacoes(provider);
CREATE INDEX IF NOT EXISTS idx_pix_criado_em ON pix_transacoes(criado_em);

SELECT 'PIX Real e Conciliação (PARTE 4) pronto para operação!' as status;
