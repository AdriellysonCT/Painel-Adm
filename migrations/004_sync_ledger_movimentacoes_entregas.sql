-- ============================================
-- SINCRONIZAÇÃO: Ledger <-> Movimentações Carteira
-- Data: 13/04/2026
-- ============================================

-- 0. Dropar views existentes para recriar
DROP VIEW IF EXISTS view_conciliacao_splits CASCADE;
DROP VIEW IF EXISTS view_conciliacao_ledger_movimentacoes CASCADE;
DROP VIEW IF EXISTS view_repasse_entregadores CASCADE;
DROP VIEW IF EXISTS view_entregas_ledger CASCADE;

-- 1. VIEW: Entregas do Ledger com detalhes completos (fonte: ledger_lancamentos)
-- Esta é a FONTE DA VERDADE para repasses ao entregador
CREATE VIEW view_entregas_ledger AS
SELECT
    l.id AS id_ledger,
    l.referencia_externa AS id_entrega,
    l.conta_recebedora_id AS id_entregador,
    e.nome AS nome_entregador,
    e.chave_pix,
    e.frequencia_pagamento,
    e.data_ultimo_pagamento,
    l.id_restaurante,
    r.nome_fantasia AS nome_restaurante,
    l.id_pedido,
    l.valor AS valor_entrega,
    l.status AS status_ledger,
    l.categoria_contabil,
    l.criado_em AS data_entrega
FROM ledger_lancamentos l
INNER JOIN entregadores_app e ON l.conta_recebedora_id = e.id
LEFT JOIN restaurantes_app r ON l.id_restaurante = r.id
WHERE l.tipo = 'ENTREGA'
ORDER BY l.criado_em DESC;

-- 2. VIEW: Repasse por Entregador (baseado no LEDGER - fonte da verdade)
CREATE VIEW view_repasse_entregadores AS
WITH entregas_ledger AS (
    SELECT
        l.conta_recebedora_id AS id_entregador,
        COUNT(l.id) AS qtd_entregas,
        COALESCE(SUM(l.valor), 0) AS total_entregas,
        MAX(l.criado_em) AS ultima_entrega
    FROM ledger_lancamentos l
    WHERE l.tipo = 'ENTREGA'
      AND l.status = 'CONFIRMADO'
    GROUP BY l.conta_recebedora_id
),
pagamentos_feitos AS (
    SELECT
        m.id_carteira,
        c.id_usuario AS id_entregador,
        COUNT(m.id) AS qtd_pagamentos,
        COALESCE(SUM(m.valor), 0) AS total_pago
    FROM movimentacoes_carteira m
    INNER JOIN carteiras c ON m.id_carteira = c.id
    WHERE m.origem = 'pagamento'
      AND m.tipo = 'saida'
      AND m.status = 'repassado'
    GROUP BY m.id_carteira, c.id_usuario
),
pagamentos_pendentes AS (
    SELECT
        m.id_carteira,
        c.id_usuario AS id_entregador,
        COUNT(m.id) AS qtd_pendentes,
        COALESCE(SUM(m.valor), 0) AS total_pendente
    FROM movimentacoes_carteira m
    INNER JOIN carteiras c ON m.id_carteira = c.id
    WHERE m.origem = 'pagamento'
      AND m.tipo = 'saida'
      AND m.status = 'pendente'
    GROUP BY m.id_carteira, c.id_usuario
)
SELECT
    e.id AS id_entregador,
    e.nome,
    e.chave_pix,
    e.frequencia_pagamento,
    e.data_ultimo_pagamento,
    COALESCE(el.qtd_entregas, 0) AS qtd_entregas_confirmadas,
    COALESCE(el.total_entregas, 0) AS total_entregas_confirmadas,
    el.ultima_entrega,
    COALESCE(pf.total_pago, 0) AS total_ja_pago,
    COALESCE(pp.total_pendente, 0) AS pagamento_pendente_em_andamento,
    -- SALDO LÍQUIDO A PAGAR
    (COALESCE(el.total_entregas, 0) - COALESCE(pf.total_pago, 0) - COALESCE(pp.total_pendente, 0)) AS saldo_liquido_pagar,
    CASE
        WHEN e.chave_pix IS NULL THEN 'SEM_CHAVE_PIX'
        WHEN (COALESCE(el.total_entregas, 0) - COALESCE(pf.total_pago, 0) - COALESCE(pp.total_pendente, 0)) <= 0 THEN 'SEM_SALDO'
        WHEN (COALESCE(el.total_entregas, 0) - COALESCE(pf.total_pago, 0) - COALESCE(pp.total_pendente, 0)) > 10000 THEN 'VALOR_SUSPEITO'
        ELSE 'OK'
    END AS status_validacao
FROM entregadores_app e
LEFT JOIN entregas_ledger el ON e.id = el.id_entregador
LEFT JOIN pagamentos_feitos pf ON e.id = pf.id_entregador
LEFT JOIN pagamentos_pendentes pp ON e.id = pp.id_entregador
WHERE COALESCE(el.total_entregas, 0) - COALESCE(pf.total_pago, 0) - COALESCE(pp.total_pendente, 0) > 0.01
ORDER BY saldo_liquido_pagar DESC;

-- 3. VIEW: Conciliação Ledger vs Movimentacoes (detectar diferenças)
CREATE VIEW view_conciliacao_ledger_movimentacoes AS
SELECT
    e.id AS id_entregador,
    e.nome,
    COALESCE(ledger.total_entregas, 0) AS total_ledger,
    COALESCE(mov.total_entregas, 0) AS total_movimentacoes,
    COALESCE(ledger.total_entregas, 0) - COALESCE(mov.total_entregas, 0) AS diferenca,
    COALESCE(ledger.qtd_entregas, 0) AS qtd_ledger,
    COALESCE(mov.qtd_entregas, 0) AS qtd_movimentacoes,
    CASE
        WHEN ABS(COALESCE(ledger.total_entregas, 0) - COALESCE(mov.total_entregas, 0)) < 0.01 THEN 'OK'
        ELSE 'DIVERGENTE'
    END AS status_conciliacao
FROM entregadores_app e
LEFT JOIN (
    SELECT 
        l.conta_recebedora_id AS id_entregador,
        COUNT(*) AS qtd_entregas,
        SUM(l.valor) AS total_entregas
    FROM ledger_lancamentos l
    WHERE l.tipo = 'ENTREGA' AND l.status = 'CONFIRMADO'
    GROUP BY l.conta_recebedora_id
) ledger ON e.id = ledger.id_entregador
LEFT JOIN (
    SELECT
        c.id_usuario AS id_entregador,
        COUNT(*) AS qtd_entregas,
        SUM(m.valor) AS total_entregas
    FROM movimentacoes_carteira m
    INNER JOIN carteiras c ON m.id_carteira = c.id
    WHERE m.origem = 'entrega' AND m.tipo = 'entrada' AND m.status = 'confirmado'
    GROUP BY c.id_usuario
) mov ON e.id = mov.id_entregador
WHERE ledger.id_entregador IS NOT NULL OR mov.id_entregador IS NOT NULL;

-- 4. VIEW: Conciliação de Splits por Restaurante (completa)
CREATE VIEW view_conciliacao_splits AS
SELECT
    l.id_restaurante,
    r.nome_fantasia,
    COUNT(l.id) AS qtd_entregas,
    SUM(l.valor) AS total_taxas_entrega,
    AVG(l.valor) AS media_taxa_entrega,
    COUNT(DISTINCT l.id_pedido) AS qtd_pedidos_unicos,
    MIN(l.criado_em) AS primeira_entrega,
    MAX(l.criado_em) AS ultima_entrega
FROM ledger_lancamentos l
LEFT JOIN restaurantes_app r ON l.id_restaurante = r.id
WHERE l.tipo = 'ENTREGA'
  AND l.status = 'CONFIRMADO'
  AND l.id_restaurante IS NOT NULL
GROUP BY l.id_restaurante, r.nome_fantasia
ORDER BY total_taxas_entrega DESC;

-- 5. Comentários
COMMENT ON VIEW view_entregas_ledger IS 'Cada entrega do ledger com detalhes completos (fonte da verdade)';
COMMENT ON VIEW view_repasse_entregadores IS 'Quanto devo pagar a cada entregador (baseado no ledger)';
COMMENT ON VIEW view_conciliacao_ledger_movimentacoes IS 'Detecta divergências entre ledger e movimentacoes_carteira';
COMMENT ON VIEW view_conciliacao_splits IS 'Auditoria de entregas por restaurante para conciliação com split EFI';
