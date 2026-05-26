-- ============================================
-- MIGRATION: Ledger Cash & Digital Views
-- Adiciona suporte a DINHEIRO_FISICO / PIX_CARTAO no ledger
-- Data: 26/05/2026
-- ============================================

-- 1. Adicionar coluna natureza se não existir
ALTER TABLE ledger_lancamentos ADD COLUMN IF NOT EXISTS natureza TEXT;

-- 2. Adicionar coluna conta_recebedora_id se não existir (para compatibilidade)
-- (já deve existir, mas garantimos)
ALTER TABLE ledger_lancamentos ADD COLUMN IF NOT EXISTS conta_recebedora_id UUID;

-- 3. Função para inserir lançamento no ledger (cash/digital)
CREATE OR REPLACE FUNCTION inserir_lancamento_ledger(
  p_entregador_id UUID,
  p_tipo_transacao TEXT,
  p_natureza TEXT,
  p_valor DECIMAL,
  p_descricao TEXT,
  p_entrega_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ledger_lancamentos (
    tipo, natureza, valor,
    conta_recebedora_id,
    referencia_externa, categoria_contabil, status
  ) VALUES (
    p_tipo_transacao, p_natureza, p_valor,
    p_entregador_id,
    p_entrega_id, p_descricao, 'CONFIRMADO'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION inserir_lancamento_ledger TO authenticated;

-- 4. View: Extrato do Entregador (unifica cash, digital e entregas)
CREATE OR REPLACE VIEW view_extrato_entregador AS
SELECT 
  l.id,
  l.tipo as tipo_movimentacao,
  l.natureza,
  l.valor,
  l.categoria_contabil as descricao,
  l.criado_em,
  l.referencia_externa as referencia_id,
  'pedido' as referencia_tipo,
  l.status,
  l.conta_recebedora_id as entregador_id,
  l.tipo as tipo_transacao
FROM ledger_lancamentos l
WHERE l.status = 'CONFIRMADO'
  AND l.conta_recebedora_id IS NOT NULL
ORDER BY l.criado_em DESC;

GRANT SELECT ON view_extrato_entregador TO authenticated;

-- 5. View: Resumo Cash vs Digital por Entregador
CREATE OR REPLACE VIEW view_resumo_cash_digital_entregadores AS
SELECT 
  e.id as entregador_id,
  e.nome,
  e.chave_pix,
  COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'DINHEIRO_FISICO' AND l.natureza = 'CREDITO'), 0) as total_cash_credito,
  COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'DINHEIRO_FISICO' AND l.natureza = 'DEBITO'), 0) as total_cash_debito,
  COUNT(*) FILTER (WHERE l.tipo = 'DINHEIRO_FISICO' AND l.natureza = 'CREDITO') as qtd_cash_credito,
  COUNT(*) FILTER (WHERE l.tipo = 'DINHEIRO_FISICO') as qtd_cash_total,
  COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'PIX_CARTAO'), 0) as total_digital,
  COUNT(*) FILTER (WHERE l.tipo = 'PIX_CARTAO') as qtd_digital,
  COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'ENTREGA'), 0) as total_entregas,
  COUNT(*) FILTER (WHERE l.tipo = 'ENTREGA') as qtd_entregas,
  -- Taxa estimada devida: total_cash_credito - total_cash_debito (o que o entregador coletou - o que foi repassado ao restaurante)
  -- Isso representa quanto o entregador ficou devendo ao sistema
  (COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'DINHEIRO_FISICO' AND l.natureza = 'CREDITO'), 0) -
   COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'DINHEIRO_FISICO' AND l.natureza = 'DEBITO'), 0)) as saldo_cash_liquido,
  MAX(l.criado_em) FILTER (WHERE l.tipo IN ('DINHEIRO_FISICO', 'PIX_CARTAO')) as ultima_movimentacao
FROM entregadores_app e
LEFT JOIN ledger_lancamentos l ON l.conta_recebedora_id = e.id
  AND l.status = 'CONFIRMADO'
GROUP BY e.id, e.nome, e.chave_pix
ORDER BY e.nome;

GRANT SELECT ON view_resumo_cash_digital_entregadores TO authenticated;

-- 6. View: Extrato detalhado de UM entregador específico (cash + digital + entregas)
CREATE OR REPLACE VIEW view_extrato_completo_entregador AS
SELECT 
  l.id as lancamento_id,
  l.criado_em,
  l.tipo as tipo_transacao,
  l.natureza,
  l.valor,
  l.categoria_contabil as descricao,
  l.referencia_externa as entrega_id,
  l.status,
  l.conta_recebedora_id as entregador_id,
  e.nome as nome_entregador,
  CASE 
    WHEN l.natureza = 'CREDITO' THEN 'Entrada (crédito)'
    WHEN l.natureza = 'DEBITO' THEN 'Saída (débito)'
    ELSE l.tipo
  END as tipo_formatado
FROM ledger_lancamentos l
LEFT JOIN entregadores_app e ON l.conta_recebedora_id = e.id
WHERE l.conta_recebedora_id IS NOT NULL
  AND l.status = 'CONFIRMADO'
ORDER BY l.criado_em DESC;

GRANT SELECT ON view_extrato_completo_entregador TO authenticated;

SELECT 'Migration 006: Ledger Cash & Digital views criadas com sucesso!' as status;
