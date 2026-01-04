-- ============================================
-- SCRIPT PARA ADICIONAR TIPO DE PEDIDO
-- FomeNinja - Painel Administrativo
-- ============================================

-- Adicionar coluna tipo_pedido na tabela movimentacoes_carteira
ALTER TABLE movimentacoes_carteira 
ADD COLUMN IF NOT EXISTS tipo_pedido TEXT CHECK (tipo_pedido IN ('entrega', 'retirada', 'local'));

-- Atualizar dados existentes com valores padrão (opcional)
-- Você pode ajustar isso baseado na sua lógica de negócio
UPDATE movimentacoes_carteira 
SET tipo_pedido = 'entrega' 
WHERE tipo_pedido IS NULL 
  AND tipo = 'entrada'
  AND origem = 'pedido';

-- Recriar a view para incluir tipo_pedido
DROP VIEW IF EXISTS view_extrato_carteira;

CREATE OR REPLACE VIEW view_extrato_carteira AS
SELECT 
    m.id as id_movimentacao,
    c.id_usuario,
    c.tipo_usuario,
    m.tipo,
    m.origem,
    m.referencia_id,
    m.descricao,
    m.valor,
    m.status,
    m.comprovante_url,
    m.criado_em,
    m.tipo_pedido,
    CASE 
        WHEN c.tipo_usuario = 'restaurante' THEN r.nome_fantasia
        WHEN c.tipo_usuario = 'entregador' THEN e.nome
    END as nome_entidade
FROM movimentacoes_carteira m
INNER JOIN carteiras c ON m.id_carteira = c.id
LEFT JOIN restaurantes_app r ON c.id_usuario = r.id AND c.tipo_usuario = 'restaurante'
LEFT JOIN entregadores_app e ON c.id_usuario = e.id AND c.tipo_usuario = 'entregador';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'movimentacoes_carteira' 
  AND column_name = 'tipo_pedido';

-- Verificar dados com tipo_pedido
SELECT 
    id_movimentacao,
    tipo_usuario,
    descricao,
    tipo_pedido,
    valor,
    status
FROM view_extrato_carteira
WHERE tipo_usuario = 'restaurante'
LIMIT 10;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
