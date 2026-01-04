-- ============================================
-- FIX: Adicionar entregadores faltantes
-- ============================================

-- Verificar quais IDs de entregadores existem nas movimentações mas não na tabela entregadores_app
SELECT DISTINCT m.id_usuario
FROM movimentacoes_carteira m
LEFT JOIN entregadores_app e ON m.id_usuario = e.id
WHERE m.tipo_usuario = 'entregador'
  AND e.id IS NULL;

-- Inserir o entregador específico que está faltando
INSERT INTO entregadores_app (id, nome, email, telefone)
VALUES 
    ('0228f2ea-bc96-45dc-8a38-74f226c8aea0', 'Entregador Teste', 'entregador@email.com', '(11) 99999-9999')
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome;

-- ============================================
-- ALTERNATIVA: Criar entregadores automaticamente
-- para todos os IDs que estão nas movimentações
-- ============================================

-- Inserir entregadores faltantes automaticamente
INSERT INTO entregadores_app (id, nome, email)
SELECT DISTINCT 
    m.id_usuario as id,
    'Entregador ' || SUBSTRING(m.id_usuario::text, 1, 8) as nome,
    'entregador_' || SUBSTRING(m.id_usuario::text, 1, 8) || '@temp.com' as email
FROM movimentacoes_carteira m
LEFT JOIN entregadores_app e ON m.id_usuario = e.id
WHERE m.tipo_usuario = 'entregador'
  AND e.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verificar se funcionou
SELECT * FROM entregadores_app WHERE id = '0228f2ea-bc96-45dc-8a38-74f226c8aea0';
