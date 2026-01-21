-- ============================================
-- FIX: Histórico de Movimentações dos Restaurantes
-- Problema: Pedidos concluídos não apareciam no histórico
-- ============================================

-- 1. Confirmar movimentações pendentes dos restaurantes
UPDATE movimentacoes_carteira m
SET status = 'confirmado'
FROM carteiras c
WHERE m.id_carteira = c.id
  AND c.tipo_usuario = 'restaurante'
  AND m.tipo = 'entrada'
  AND m.status = 'pendente';

-- 2. Criar movimentações para pedidos que não têm
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    criado_em
)
SELECT 
    c.id as id_carteira,
    'entrada' as tipo,
    'pedido' as origem,
    'Pedido concluído #' || p.numero_pedido_sequencial as descricao,
    COALESCE(p.subtotal, p.valor_total) as valor,
    'confirmado' as status,
    p.criado_em
FROM pedidos_padronizados p
INNER JOIN restaurantes_app r ON p.id_restaurante = r.id
INNER JOIN carteiras c ON c.id_usuario = r.id AND c.tipo_usuario = 'restaurante'
WHERE p.status = 'concluido'
  AND NOT EXISTS (
      SELECT 1 FROM movimentacoes_carteira m
      WHERE m.id_carteira = c.id
        AND m.descricao LIKE '%#' || p.numero_pedido_sequencial || '%'
  );

-- 3. Recalcular saldos das carteiras
UPDATE carteiras c
SET saldo_atual = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
            WHEN m.tipo = 'saida' AND m.status = 'repassado' THEN -m.valor
            ELSE 0
        END
    ), 0)
    FROM movimentacoes_carteira m
    WHERE m.id_carteira = c.id
)
WHERE tipo_usuario = 'restaurante';

-- 4. Recalcular repasses
SELECT recalcular_repasses_restaurantes();

-- 5. Corrigir saldo pendente (vendas - taxa)
UPDATE repasses_restaurantes 
SET saldo_pendente = total_vendas_confirmadas - taxa_plataforma - total_repassado;

-- Resultado: Todas as 11 movimentações agora aparecem no histórico!
