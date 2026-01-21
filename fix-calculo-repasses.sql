-- ============================================
-- FIX: Correção do Cálculo de Repasses
-- Bug: Restaurante recebia R$37,50 em vez de R$111,80
-- ============================================

-- Problema identificado:
-- A view estava somando apenas 'subtotal', mas pedidos antigos
-- têm subtotal = NULL e apenas valor_total preenchido

-- Solução: Usar COALESCE(subtotal, valor_total)

-- 1. Corrigir view de repasses com taxa
CREATE OR REPLACE VIEW view_repasses_com_taxa AS
SELECT 
    p.id as id_pedido,
    p.numero_pedido_sequencial,
    p.id_restaurante,
    r.nome_fantasia,
    p.status,
    p.tipo_pedido,
    p.criado_em,
    -- CORREÇÃO: Usar valor_total quando subtotal for null
    COALESCE(p.subtotal, p.valor_total, 0) as subtotal_original,
    (SELECT taxa_total FROM calcular_taxa_pedido(p.id)) as taxa_plataforma,
    COALESCE(p.subtotal, p.valor_total, 0) as valor_restaurante,
    COALESCE(p.taxa_entrega, 0) as taxa_entrega,
    (SELECT qtd_itens FROM calcular_taxa_pedido(p.id)) as qtd_itens,
    COALESCE(p.valor_total, 0) as valor_total_pedido
FROM pedidos_padronizados p
INNER JOIN restaurantes_app r ON p.id_restaurante = r.id
WHERE p.status IN ('concluido', 'entregue')
ORDER BY p.criado_em DESC;

-- 2. Recalcular repasses com valores corretos
SELECT recalcular_repasses_restaurantes();

-- 3. Corrigir saldo pendente (vendas - taxa - já pago)
UPDATE repasses_restaurantes 
SET saldo_pendente = total_vendas_confirmadas - taxa_plataforma - total_repassado
WHERE total_vendas_confirmadas > 0;

-- 4. Verificar resultado
SELECT 
    r.nome_fantasia,
    rr.total_vendas_confirmadas as vendas,
    rr.taxa_plataforma,
    rr.total_vendas_confirmadas - rr.taxa_plataforma as deve_receber,
    rr.saldo_pendente as a_pagar,
    rr.total_repassado as ja_pago
FROM repasses_restaurantes rr
INNER JOIN restaurantes_app r ON rr.id_restaurante = r.id
WHERE rr.saldo_pendente > 0;

-- Resultado esperado para fenix carnes:
-- Vendas: R$ 123,30
-- Taxa: R$ 11,50
-- Deve receber: R$ 111,80 ✅
-- (Antes estava: R$ 37,50 ❌ - diferença de R$ 74,30!)
