-- ============================================
-- SETUP: Sistema de Saque Profissional + Antifraude
-- Data: 01/03/2026
-- ============================================

-- 1. Criar Tipos ENUM e Tabelas Relacionadas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_saque_enum') THEN
        CREATE TYPE status_saque_enum AS ENUM (
          'SOLICITADO',
          'EM_ANALISE',
          'APROVADO',
          'REJEITADO',
          'PAGO',
          'BLOQUEADO'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS solicitacoes_saque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES contas_contabeis(id),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  status status_saque_enum DEFAULT 'SOLICITADO',
  idempotency_key TEXT UNIQUE NOT NULL,
  solicitado_em TIMESTAMPTZ DEFAULT NOW(),
  analisado_por UUID, -- Referência ao admin que analisou
  analisado_em TIMESTAMPTZ,
  comprovante_url TEXT
);

CREATE TABLE IF NOT EXISTS auditoria_financeira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES contas_contabeis(id),
  motivo TEXT NOT NULL,
  resolvido BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ
);

-- 2. Ativar RLS
ALTER TABLE solicitacoes_saque ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_financeira ENABLE ROW LEVEL SECURITY;

-- 3. Função: Solicitar Saque Seguro (com Idempotência e Antifraude)
CREATE OR REPLACE FUNCTION solicitar_saque_seguro(
  p_conta_id UUID,
  p_valor NUMERIC,
  p_idempotency_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saque_id UUID;
  v_saldo_atual NUMERIC;
BEGIN
  -- 3.1. Verificar se a conta está bloqueada por fraude (Antifraude)
  IF EXISTS (
    SELECT 1 FROM auditoria_financeira
    WHERE conta_id = p_conta_id
    AND resolvido = false
  ) THEN
    RAISE EXCEPTION 'Conta temporariamente bloqueada por atividade suspeita. Contate o administrador.';
  END IF;

  -- 3.2. Idempotência: Se já houver saque com essa key, retorna o ID existente
  SELECT id INTO v_saque_id
  FROM solicitacoes_saque
  WHERE idempotency_key = p_idempotency_key;

  IF v_saque_id IS NOT NULL THEN
    RETURN v_saque_id;
  END IF;

  -- 3.3. Verificar Saldo
  SELECT saldo INTO v_saldo_atual
  FROM view_saldos_contabeis
  WHERE id = p_conta_id;

  IF v_saldo_atual IS NULL OR v_saldo_atual < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente para saque. Disponível: R$ %', COALESCE(v_saldo_atual, 0);
  END IF;

  -- 3.4. Criar solicitação
  INSERT INTO solicitacoes_saque (conta_id, valor, idempotency_key, status)
  VALUES (p_conta_id, p_valor, p_idempotency_key, 'SOLICITADO')
  RETURNING id INTO v_saque_id;

  RETURN v_saque_id;
END;
$$;

-- 4. Antifraude: Detecção de Múltiplos Lançamentos (Trigger)
CREATE OR REPLACE FUNCTION detectar_fraude_lancamentos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qtd INTEGER;
BEGIN
  -- Regra: > 5 lançamentos rápidos (5 min) para a mesma conta (origem ou destino)
  SELECT COUNT(*) INTO v_qtd
  FROM ledger_lancamentos
  WHERE (conta_destino_id = NEW.conta_destino_id OR conta_origem_id = NEW.conta_origem_id)
    AND criado_em > NOW() - INTERVAL '5 minutes';

  IF v_qtd > 5 THEN
    -- Registrar alerta de fraude
    INSERT INTO auditoria_financeira (
      conta_id,
      motivo,
      criado_em
    ) VALUES (
      COALESCE(NEW.conta_destino_id, NEW.conta_origem_id),
      'MULTIPLOS_LANCAMENTOS_SUSPEITOS: ' || v_qtd || ' transações em 5 minutos.',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detectar_fraude ON ledger_lancamentos;
CREATE TRIGGER trg_detectar_fraude
    AFTER INSERT ON ledger_lancamentos
    FOR EACH ROW
    EXECUTE FUNCTION detectar_fraude_lancamentos();

-- 5. Função: Desbloqueio Seguro via Senha de Admin
CREATE OR REPLACE FUNCTION desbloquear_conta_suspeita(
  p_conta_id UUID,
  p_senha_admin TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id UUID := auth.uid();
  v_role admin_role_enum;
  v_senha_hash TEXT;
  v_is_correct BOOLEAN;
BEGIN
  -- 5.1. Verificar se quem chama é admin competente
  SELECT role INTO v_role
  FROM admin_roles
  WHERE user_id = v_admin_user_id;

  IF v_role NOT IN ('SUPER_ADMIN', 'FINANCEIRO') THEN
    RAISE EXCEPTION 'Permissão insuficiente para desbloquear contas.';
  END IF;

  -- 5.2. Verificar Senha (Cross-check com auth.users via pgcrypto)
  -- NOTA: Como estamos em SECURITY DEFINER, temos acesso ao schema auth
  SELECT encrypted_password INTO v_senha_hash
  FROM auth.users
  WHERE id = v_admin_user_id;

  -- Usar pgcrypto.crypt para comparar
  IF v_senha_hash IS NULL OR crypt(p_senha_admin, v_senha_hash) <> v_senha_hash THEN
    RAISE EXCEPTION 'Senha administrativa inválida.';
  END IF;

  -- 5.3. Efetuar Desbloqueio
  UPDATE auditoria_financeira
  SET resolvido = true,
      resolvido_por = v_admin_user_id,
      resolvido_em = NOW()
  WHERE conta_id = p_conta_id
    AND resolvido = false;
END;
$$;

-- 6. Políticas RLS para as novas tabelas
-- Admins veem tudo
CREATE POLICY admin_select_saques ON solicitacoes_saque FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

CREATE POLICY admin_select_auditoria ON auditoria_financeira FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Usuários veem apenas suas solicitações
CREATE POLICY user_select_proprio_saque ON solicitacoes_saque FOR SELECT TO authenticated
USING (conta_id IN (SELECT id FROM contas_contabeis WHERE referencia_id = auth.uid()));

-- Inserção no saque só via função (bloqueio direto)
CREATE POLICY block_direct_insert_saque ON solicitacoes_saque FOR INSERT TO authenticated WITH CHECK (false);

SELECT 'Sistema de Saque e Antifraude (PARTE 3) configurado!' as status;
