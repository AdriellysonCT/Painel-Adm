-- ============================================
-- SETUP: Ledger Contábil Imutável (Refatoração Financeira)
-- Data: 01/03/2026
-- ============================================

-- 1. Criar ENUMs formais para garantir integridade tipada
DO $$ BEGIN
    CREATE TYPE tipo_conta_enum AS ENUM (
      'ENTREGADOR',
      'RESTAURANTE',
      'PLATAFORMA'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_lancamento_enum AS ENUM (
      'ENTREGA',
      'TAXA_PLATAFORMA',
      'SAQUE',
      'ESTORNO',
      'AJUSTE_MANUAL'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_lancamento_enum AS ENUM (
      'PENDENTE',
      'CONFIRMADO',
      'CANCELADO'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Criar tabela: contas_contabeis
-- Representa a entidade financeira (o "Titular") dentro do ledger
CREATE TABLE IF NOT EXISTS contas_contabeis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo tipo_conta_enum NOT NULL,
    referencia_id UUID, -- ID do entregador ou restaurante (NULL para Plataforma)
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir que cada entrega ou restaurante tenha apenas uma conta ativa
    CONSTRAINT unique_conta_referencia UNIQUE (tipo, referencia_id)
);

-- 3. Criar tabela: ledger_lancamentos (IMUTÁVEL)
-- Registro definitivo de toda movimentação de valor
CREATE TABLE IF NOT EXISTS ledger_lancamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_origem_id UUID REFERENCES contas_contabeis(id),
    conta_destino_id UUID REFERENCES contas_contabeis(id),
    valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
    tipo tipo_lancamento_enum NOT NULL,
    status status_lancamento_enum DEFAULT 'CONFIRMADO',
    referencia_externa TEXT, -- Ex: ID do Pedido ou Código Pix
    criado_por_admin_id UUID,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir que origem e destino sejam diferentes (evitar loops)
    CONSTRAINT lancamento_origem_destino_diff CHECK (conta_origem_id != conta_destino_id)
);

-- 4. Criar VIEW: view_saldos_contabeis
-- Cálculo dinâmico e auditável do saldo real no momento da consulta
CREATE OR REPLACE VIEW view_saldos_contabeis AS
SELECT 
  c.id,
  c.tipo,
  c.referencia_id,
  COALESCE(SUM(
    CASE
      WHEN l.conta_destino_id = c.id AND l.status = 'CONFIRMADO' THEN l.valor
      WHEN l.conta_origem_id = c.id AND l.status = 'CONFIRMADO' THEN -l.valor
      ELSE 0
    END
  ), 0) AS saldo
FROM contas_contabeis c
LEFT JOIN ledger_lancamentos l
  ON l.conta_origem_id = c.id
  OR l.conta_destino_id = c.id
GROUP BY c.id, c.tipo, c.referencia_id;

-- 5. Criar conta da Plataforma automaticamente (Single Global Account)
INSERT INTO contas_contabeis (tipo, referencia_id)
SELECT 'PLATAFORMA', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM contas_contabeis WHERE tipo = 'PLATAFORMA'
);

-- 6. Indices Estratégicos para Performance em Escala
CREATE INDEX IF NOT EXISTS idx_ledger_conta_origem ON ledger_lancamentos(conta_origem_id);
CREATE INDEX IF NOT EXISTS idx_ledger_conta_destino ON ledger_lancamentos(conta_destino_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON ledger_lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_ledger_criado_em ON ledger_lancamentos(criado_em);

-- 7. Triggers de Imutabilidade
-- Bloqueia UPDATE em valores e DELETE em qualquer registro
CREATE OR REPLACE FUNCTION fn_block_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloquear DELETE total
    IF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'A tabela ledger_lancamentos é imutável. Deleção não permitida.';
    END IF;

    -- Bloquear UPDATE se já estiver confirmado
    IF (TG_OP = 'UPDATE') THEN
        -- Não permitir mudar valor NUNCA
        IF OLD.valor <> NEW.valor THEN
            RAISE EXCEPTION 'Não é permitido alterar o valor de um lançamento contábil.';
        END IF;

        -- Se status era CONFIRMADO, não permitir nenhuma mudança
        IF OLD.status = 'CONFIRMADO' THEN
            RAISE EXCEPTION 'Lançamento CONFIRMADO não pode ser alterado.';
        END IF;

        -- Permitir apenas mudança de PENDENTE para CONFIRMADO ou CANCELADO
        IF OLD.status != 'PENDENTE' THEN
             RAISE EXCEPTION 'Apenas lançamentos PENDENTES podem ter status alterado.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_immutability ON ledger_lancamentos;
CREATE TRIGGER trg_ledger_immutability
    BEFORE UPDATE OR DELETE ON ledger_lancamentos
    FOR EACH ROW
    EXECUTE FUNCTION fn_block_ledger_mutation();

-- Documentação via comentários do banco
COMMENT ON TABLE contas_contabeis IS 'Entidades financeiras do sistema (Delivery, Shop, Admin)';
COMMENT ON TABLE ledger_lancamentos IS 'Log imutável de transações financeiras (Double-Entry Ledger style)';
COMMENT ON VIEW view_saldos_contabeis IS 'Cálculo dinâmico de saldo baseado na soma de débitos e créditos';

SELECT 'Nova estrutura contábil (Ledger) criada com sucesso!' as status;
