-- ============================================
-- SYNC AUTO: Ledger → Movimentações Carteira (Trigger + Backfill)
-- Data: 13/04/2026
-- ============================================

-- 1. Função que sincroniza ledger → movimentacoes_carteira
CREATE OR REPLACE FUNCTION fn_sync_ledger_entregas()
RETURNS TRIGGER AS $$
DECLARE
    v_id_carteira UUID;
BEGIN
    -- Buscar carteira do entregador
    SELECT id INTO v_id_carteira
    FROM carteiras
    WHERE id_usuario = NEW.conta_recebedora_id
      AND tipo_usuario = 'entregador'
    LIMIT 1;

    -- Se não tem carteira, sai silenciosamente
    IF v_id_carteira IS NULL THEN
        RETURN NEW;
    END IF;

    -- Inserir na movimentacoes_carteira (apenas se tipo = ENTREGA e status = CONFIRMADO)
    INSERT INTO movimentacoes_carteira (
        id_carteira,
        tipo,
        origem,
        referencia_id,
        descricao,
        valor,
        status,
        id_restaurante,
        id_pedido,
        tipo_pedido,
        criado_em
    ) VALUES (
        v_id_carteira,
        'entrada',
        'entrega',
        NEW.referencia_externa::UUID,
        COALESCE(NEW.categoria_contabil, 'Entrega registrada no ledger'),
        NEW.valor,
        'confirmado',
        NEW.id_restaurante,
        NEW.id_pedido,
        'entrega',
        NEW.criado_em
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger no ledger para auto-sincronizar
DROP TRIGGER IF EXISTS trg_sync_ledger_entregas ON ledger_lancamentos;
CREATE TRIGGER trg_sync_ledger_entregas
    AFTER INSERT ON ledger_lancamentos
    FOR EACH ROW
    WHEN (NEW.tipo = 'ENTREGA' AND NEW.status = 'CONFIRMADO')
    EXECUTE FUNCTION fn_sync_ledger_entregas();

-- 3. BACKFILL: Sincronizar entregas existentes no ledger que não estão em movimentacoes
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    referencia_id,
    descricao,
    valor,
    status,
    id_restaurante,
    id_pedido,
    tipo_pedido,
    criado_em
)
SELECT
    c.id AS id_carteira,
    'entrada' AS tipo,
    'entrega' AS origem,
    l.referencia_externa::UUID AS referencia_id,
    l.categoria_contabil AS descricao,
    l.valor AS valor,
    'confirmado' AS status,
    l.id_restaurante,
    l.id_pedido,
    'entrega' AS tipo_pedido,
    l.criado_em
FROM ledger_lancamentos l
INNER JOIN entregadores_app e ON l.conta_recebedora_id = e.id
INNER JOIN carteiras c ON e.id = c.id_usuario AND c.tipo_usuario = 'entregador'
WHERE l.tipo = 'ENTREGA'
  AND l.status = 'CONFIRMADO'
  AND NOT EXISTS (
    SELECT 1 FROM movimentacoes_carteira m
    WHERE m.referencia_id::TEXT = l.referencia_externa
      AND m.origem = 'entrega'
      AND m.id_carteira = c.id
  )
ORDER BY l.criado_em;
