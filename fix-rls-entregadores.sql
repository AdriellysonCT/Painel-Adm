-- ============================================
-- FIX: Permitir leitura da tabela entregadores_app
-- ============================================

-- Verificar se RLS está ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'entregadores_app';

-- Desabilitar RLS temporariamente para desenvolvimento (CUIDADO EM PRODUÇÃO!)
ALTER TABLE entregadores_app DISABLE ROW LEVEL SECURITY;

-- OU criar uma política permissiva para leitura
ALTER TABLE entregadores_app ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON entregadores_app;
CREATE POLICY "Allow read for all" ON entregadores_app
    FOR SELECT
    USING (true);

-- Verificar políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'entregadores_app';
