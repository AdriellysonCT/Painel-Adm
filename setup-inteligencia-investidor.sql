-- ============================================
-- SETUP: Inteligência Financeira e Projeção (Nível Investidor)
-- Data: 01/03/2026
-- ============================================

-- 1. View: GMV (Gross Merchandise Volume) Mensal
-- Volume bruto de transações processadas pela plataforma (o "tamanho" do marketplace)
CREATE OR REPLACE VIEW gmv_mensal AS
SELECT
  DATE_TRUNC('month', criado_em) AS mes,
  COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'RECEITA_ENTREGA'), 0) AS gmv
FROM ledger_lancamentos
WHERE status = 'CONFIRMADO'
GROUP BY 1
ORDER BY 1 DESC;

-- 2. View: Take Rate Mensal (Eficiência da Margem)
-- Mede quanto da transação bruta efetivamente fica como receita líquida da plataforma
CREATE OR REPLACE VIEW take_rate_mensal AS
SELECT
  g.mes,
  g.gmv,
  d.receita_liquida_plataforma,
  CASE 
    WHEN g.gmv > 0 THEN (d.receita_liquida_plataforma / g.gmv) * 100 
    ELSE 0 
  END AS take_rate_percentual
FROM gmv_mensal g
JOIN dre_mensal d ON g.mes = d.mes
ORDER BY g.mes DESC;

-- 3. View: Previsão de Receita Próximo Mês (Média Móvel de 3 Meses)
-- Projeção conservadora baseada na performance trimestral recente
CREATE OR REPLACE VIEW previsao_receita_proximo_mes AS
SELECT
  COALESCE(AVG(receita_liquida_plataforma), 0) AS media_ultimos_3_meses
FROM (
  SELECT receita_liquida_plataforma
  FROM dre_mensal
  ORDER BY mes DESC
  LIMIT 3
) sub;

-- 4. View: Previsão de Fluxo de Caixa (Média Diária Móvel)
-- Estima a necessidade de capital de giro e volume financeiro mensal projetado
CREATE OR REPLACE VIEW previsao_fluxo_caixa AS
SELECT
  COALESCE(AVG(total_movimentado_dia), 0) AS media_diaria,
  COALESCE(AVG(total_movimentado_dia), 0) * 30 AS estimativa_mes_projetado
FROM (
  SELECT (entradas_totais + saidas_totais) AS total_movimentado_dia
  FROM fluxo_caixa_diario
  ORDER BY dia DESC
  LIMIT 30
) sub;

-- 5. View: Painel do Investidor (Resumo Executivo / Data-Room)
-- Consolidação dos KPIS vitais para análise de ROAS, Burn Rate e Valuation
CREATE OR REPLACE VIEW painel_investidor AS
SELECT
  COALESCE((SELECT gmv FROM gmv_mensal ORDER BY mes DESC LIMIT 1), 0) AS ultimo_gmv_mensal,
  COALESCE((SELECT receita_liquida_plataforma FROM dre_mensal ORDER BY mes DESC LIMIT 1), 0) AS ultima_receita_liquida,
  COALESCE((SELECT take_rate_percentual FROM take_rate_mensal ORDER BY mes DESC LIMIT 1), 0) AS ultimo_take_rate,
  COALESCE((SELECT media_ultimos_3_meses FROM previsao_receita_proximo_mes), 0) AS receita_liquida_projetada,
  COALESCE((SELECT estimativa_mes_projetado FROM previsao_fluxo_caixa), 0) AS volume_caixa_projetado_30d;

-- 6. Garantir permissões de acesso (Somente para Governança Financeira)
GRANT SELECT ON gmv_mensal TO authenticated;
GRANT SELECT ON take_rate_mensal TO authenticated;
GRANT SELECT ON previsao_receita_proximo_mes TO authenticated;
GRANT SELECT ON previsao_fluxo_caixa TO authenticated;
GRANT SELECT ON painel_investidor TO authenticated;

SELECT 'Camada de Inteligência Financeira (PARTE 6) Ativada!' as status;
