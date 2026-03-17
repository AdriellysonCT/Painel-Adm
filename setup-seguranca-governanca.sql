-- ============================================
-- SETUP: Camada de Segurança e Governança (RLS + Roles)
-- Data: 01/03/2026
-- ============================================

-- 1. Criar Papéis Administrativos
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN
        CREATE TYPE admin_role_enum AS ENUM (
          'SUPER_ADMIN',
          'FINANCEIRO',
          'OPERADOR',
          'SOMENTE_LEITURA'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role admin_role_enum NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que cada usuário tenha apenas uma role administrativa
  CONSTRAINT unique_admin_user UNIQUE(user_id)
);

-- 2. Ativar RLS nas novas tabelas (Governança Iniciada)
ALTER TABLE contas_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para contas_contabeis

-- Admin: Select em tudo
DROP POLICY IF EXISTS admin_select_all_contas ON contas_contabeis;
CREATE POLICY admin_select_all_contas
ON contas_contabeis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid()
  )
);

-- Entregador: Ver apenas própria conta
DROP POLICY IF EXISTS entregador_select_propria_conta ON contas_contabeis;
CREATE POLICY entregador_select_propria_conta
ON contas_contabeis
FOR SELECT
TO authenticated
USING (
  tipo = 'ENTREGADOR'
  AND referencia_id = auth.uid()
);

-- Restaurante: Ver apenas própria conta
DROP POLICY IF EXISTS restaurante_select_propria_conta ON contas_contabeis;
CREATE POLICY restaurante_select_propria_conta
ON contas_contabeis
FOR SELECT
TO authenticated
USING (
  tipo = 'RESTAURANTE'
  AND referencia_id = auth.uid()
);

-- 4. Bloquear INSERT/UPDATE/DELETE direto no ledger_lancamentos (Imutabilidade RLS)
DROP POLICY IF EXISTS bloquear_modificacao_direta_ledger ON ledger_lancamentos;
CREATE POLICY bloquear_modificacao_direta_ledger
ON ledger_lancamentos
FOR ALL
TO authenticated
WITH CHECK (false);

-- Permitir SELECT no ledger (Admins veem tudo, Usuários veem registros vinculados à sua conta)
DROP POLICY IF EXISTS admin_select_all_ledger ON ledger_lancamentos;
CREATE POLICY admin_select_all_ledger
ON ledger_lancamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS usuario_select_proprio_ledger ON ledger_lancamentos;
CREATE POLICY usuario_select_proprio_ledger
ON ledger_lancamentos
FOR SELECT
TO authenticated
USING (
  conta_origem_id IN (SELECT id FROM contas_contabeis WHERE referencia_id = auth.uid()) OR
  conta_destino_id IN (SELECT id FROM contas_contabeis WHERE referencia_id = auth.uid())
);

-- 5. Funções Seguras (SECURITY DEFINER)
-- Bypass RLS via função controlada (Sempre usar essa função para evitar fraude)
CREATE OR REPLACE FUNCTION inserir_lancamento_seguro(
  p_origem UUID,
  p_destino UUID,
  p_valor NUMERIC,
  p_tipo tipo_lancamento_enum,
  p_referencia_externa TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Permite bypassar o blocking INSERT do RLS na tabela ledger
AS $$
BEGIN
  -- Validação de Permissão (Governança de Roles Administrativas)
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('SUPER_ADMIN','FINANCEIRO')
  ) THEN
    RAISE EXCEPTION 'Permissão Insuficiente: Apenas Admins com papel Financeiro ou Super podem realizar operações no Ledger.';
  END IF;

  -- Inserção Controlada com Auditoria de ID (Quem processou?)
  INSERT INTO ledger_lancamentos (
    conta_origem_id,
    conta_destino_id,
    valor,
    tipo,
    status,
    criado_por_admin_id,
    referencia_externa,
    criado_em
  )
  VALUES (
    p_origem,
    p_destino,
    p_valor,
    p_tipo,
    'CONFIRMADO',
    auth.uid(),
    p_referencia_externa,
    NOW()
  );

END;
$$;

-- 6. Limpeza de Políticas de Desenvolvimento/Abertas Antigas
-- Segurança Profissional: Remover acessos 'Allow All'
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND policyname ILIKE '%Allow all%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 7. Governança da Tabela admin_roles (Somente Super Admin Altera)
DROP POLICY IF EXISTS super_admin_manage_roles ON admin_roles;
CREATE POLICY super_admin_manage_roles
ON admin_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role = 'SUPER_ADMIN'
  )
);

DROP POLICY IF EXISTS admin_view_all_roles ON admin_roles;
CREATE POLICY admin_view_all_roles
ON admin_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid()
  )
);

SELECT 'Segurança e Governança (PARTE 2) configuradas!' as status;
