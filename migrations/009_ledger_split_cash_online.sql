-- Migration 009: Ledger com split cash/online e taxa da plataforma
-- Regra: entregas online (pix/credito) pagam R$1 se taxa_entrega < 5, R$2 se >= 5
-- Entregas em dinheiro não pagam taxa da plataforma

-- 1. View detalhada: cada entrega com método de pagamento e taxa calculada
CREATE OR REPLACE VIEW view_ledger_detalhado_entregas AS
SELECT
  l.id as ledger_id,
  l.conta_recebedora_id as entregador_id,
  e.nome as nome_entregador,
  l.valor as valor_entrega,
  l.status,
  l.id_pedido,
  l.criado_em,
  l.categoria_contabil,
  p.numero_pedido,
  p.metodo_pagamento,
  COALESCE(p.taxa_entrega, 0) as taxa_entrega,
  CASE
    WHEN p.metodo_pagamento IN ('pix', 'credito') THEN 'online'
    WHEN p.metodo_pagamento = 'dinheiro' THEN 'cash'
    ELSE 'indefinido'
  END as tipo_pagamento,
  CASE
    WHEN p.metodo_pagamento IN ('pix', 'credito') AND COALESCE(p.taxa_entrega, 0) >= 5 THEN 2.00
    WHEN p.metodo_pagamento IN ('pix', 'credito') AND COALESCE(p.taxa_entrega, 0) < 5 THEN 1.00
    ELSE 0
  END as taxa_plataforma
FROM ledger_lancamentos l
LEFT JOIN pedidos_padronizados p ON l.id_pedido = p.id
LEFT JOIN entregadores_app e ON l.conta_recebedora_id = e.id
WHERE l.tipo = 'ENTREGA' AND l.status = 'CONFIRMADO';

GRANT SELECT ON view_ledger_detalhado_entregas TO authenticated;

-- 2. View resumo por entregador
CREATE OR REPLACE VIEW view_resumo_ledger_detalhado AS
SELECT
  entregador_id,
  nome_entregador,
  COUNT(*) FILTER (WHERE tipo_pagamento = 'cash') as qtd_cash,
  COALESCE(SUM(valor_entrega) FILTER (WHERE tipo_pagamento = 'cash'), 0) as total_cash,
  COUNT(*) FILTER (WHERE tipo_pagamento = 'online') as qtd_online,
  COALESCE(SUM(valor_entrega) FILTER (WHERE tipo_pagamento = 'online'), 0) as total_online,
  COALESCE(SUM(taxa_plataforma) FILTER (WHERE tipo_pagamento = 'online'), 0) as total_taxa_plataforma,
  COUNT(*) as qtd_total,
  COALESCE(SUM(valor_entrega), 0) as total_geral,
  COALESCE(SUM(valor_entrega) FILTER (WHERE tipo_pagamento = 'online'), 0) -
    COALESCE(SUM(taxa_plataforma) FILTER (WHERE tipo_pagamento = 'online'), 0) as saldo_online_liquido
FROM view_ledger_detalhado_entregas
GROUP BY entregador_id, nome_entregador;

GRANT SELECT ON view_resumo_ledger_detalhado TO authenticated;

-- 3. View extrato detalhado de UM entregador
CREATE OR REPLACE VIEW view_extrato_ledger_detalhado AS
SELECT
  entregador_id,
  nome_entregador,
  ledger_id,
  valor_entrega,
  id_pedido,
  criado_em,
  categoria_contabil,
  numero_pedido,
  metodo_pagamento,
  taxa_entrega,
  tipo_pagamento,
  taxa_plataforma
FROM view_ledger_detalhado_entregas
ORDER BY criado_em DESC;

GRANT SELECT ON view_extrato_ledger_detalhado TO authenticated;
