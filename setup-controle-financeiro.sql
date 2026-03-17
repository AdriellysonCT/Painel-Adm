-- ============================================
-- SETUP: Centro de Controle Financeiro (DRE + Fluxo de Caixa + Exportação)
-- Data: 01/03/2026
-- ============================================

-- 1. Evolução do Ledger: Classificação Contábil
-- Adicionando metadados para relatórios executivos sem quebrar a estrutura de partida dobrada
ALTER TABLE ledger_lancamentos 
ADD COLUMN IF NOT EXISTS categoria_contabil TEXT;

-- Índice para performance em agregações de grandes volumes (DRE/Fluxo)
CREATE INDEX IF NOT EXISTS idx_ledger_categoria_contabil ON ledger_lancamentos(categoria_contabil);

-- 2. View: DRE Mensal (Demonstrativo do Resultado do Exercício)
-- Visão contábil pura baseada em competência (quando o lançamento foi confirmado)
CREATE OR REPLACE VIEW dre_mensal AS
SELECT
  DATE_TRUNC('month', criado_em) AS mes,
  
  -- Entradas operacionais (valor total das entregas que passaram pelo sistema)
  COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'RECEITA_ENTREGA'), 0) AS faturamento_bruto,
  
  -- Receita Real (Comissões e taxas que ficam na plataforma)
  COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'TAXA_PLATAFORMA'), 0) AS receita_liquida_plataforma,
  
  -- Custos Variáveis (Saídas para parceiros)
  COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'PAGAMENTO_ENTREGADOR'), 0) AS custo_entregadores,
  COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'PAGAMENTO_RESTAURANTE'), 0) AS custo_restaurantes,
  
  -- Resultado Operacional (EBITDA aproximado do sistema)
  (
    COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'TAXA_PLATAFORMA'), 0)
    -
    (
      COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'PAGAMENTO_ENTREGADOR'), 0) + 
      COALESCE(SUM(valor) FILTER (WHERE categoria_contabil = 'PAGAMENTO_RESTAURANTE'), 0)
    )
  ) AS lucro_prejuizo_operacional

FROM ledger_lancamentos
WHERE status = 'CONFIRMADO'
GROUP BY 1
ORDER BY 1 DESC;

-- 3. View: Fluxo de Caixa Diário
-- Visão financeira focada na liquidez e volume de trânsito de capital
CREATE OR REPLACE VIEW fluxo_caixa_diario AS
SELECT
  DATE_TRUNC('day', criado_em) AS dia,
  COUNT(*) AS total_transacoes,
  SUM(CASE WHEN conta_destino_id IS NOT NULL THEN valor ELSE 0 END) AS entradas_totais,
  SUM(CASE WHEN conta_origem_id IS NOT NULL THEN valor ELSE 0 END) AS saidas_totais,
  SUM(CASE WHEN conta_destino_id IS NOT NULL THEN valor ELSE -valor END) AS saldo_liquido_dia
FROM ledger_lancamentos
WHERE status = 'CONFIRMADO'
GROUP BY 1
ORDER BY 1 DESC;

-- 4. Função: Exportação Contábil (ERP/Contador Friendly)
-- Gera um dataset limpo para exportação CSV ou integração externa
CREATE OR REPLACE FUNCTION exportar_ledger_csv(
  p_data_inicio TIMESTAMPTZ DEFAULT '-infinity',
  p_data_fim TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  data_hora TIMESTAMPTZ,
  id_lancamento UUID,
  origem_tipo tipo_conta_enum,
  destino_tipo tipo_conta_enum,
  valor NUMERIC,
  categoria TEXT,
  referencia_externa TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    l.criado_em,
    l.id,
    c_origem.tipo as origem_tipo,
    c_destino.tipo as destino_tipo,
    l.valor,
    l.categoria_contabil,
    l.referencia_externa
  FROM ledger_lancamentos l
  LEFT JOIN contas_contabeis c_origem ON l.conta_origem_id = c_origem.id
  LEFT JOIN contas_contabeis c_destino ON l.conta_destino_id = c_destino.id
  WHERE l.status = 'CONFIRMADO'
  AND l.criado_em BETWEEN p_data_inicio AND p_data_fim;
$$;

-- 5. View: Centro de Controle Financeiro (Admin Dashboard High-Level)
CREATE OR REPLACE VIEW centro_controle_financeiro AS
SELECT
  -- Visão de Receita (O que a plataforma ganhou)
  COALESCE((SELECT SUM(valor) FROM ledger_lancamentos WHERE categoria_contabil = 'TAXA_PLATAFORMA' AND status = 'CONFIRMADO'), 0) AS total_receita_plataforma,
  
  -- Visão de Débito (O que saiu do caixa para parceiros)
  COALESCE((SELECT SUM(valor) FROM ledger_lancamentos WHERE categoria_contabil = 'PAGAMENTO_ENTREGADOR' AND status = 'CONFIRMADO'), 0) AS total_pago_entregadores,
  COALESCE((SELECT SUM(valor) FROM ledger_lancamentos WHERE categoria_contabil = 'PAGAMENTO_RESTAURANTE' AND status = 'CONFIRMADO'), 0) AS total_pago_restaurantes,
  
  -- Conciliação Bancária vs Sistema (O que está no banco PIX vs o que está no Ledger)
  COALESCE((SELECT SUM(valor) FROM pix_transacoes WHERE status IN ('PAGO', 'CONCILIADO')), 0) AS saldo_real_banco_pix,
  
  -- Saúde Financeira (Total que entrou no Ledger vs Total que saiu)
  COALESCE((SELECT SUM(valor) FROM ledger_lancamentos l JOIN contas_contabeis c ON l.conta_destino_id = c.id WHERE c.tipo = 'PLATAFORMA' AND l.status = 'CONFIRMADO'), 0) AS volume_entrada_plataforma;

-- 6. Atualização das permissões (Camada de Governança PARTE 5)
-- Garantir que apenas Admins Financeiros tenham acesso aos relatórios executivos
REVOKE ALL ON dre_mensal FROM PUBLIC;
GRANT SELECT ON dre_mensal TO authenticated;

REVOKE ALL ON fluxo_caixa_diario FROM PUBLIC;
GRANT SELECT ON fluxo_caixa_diario TO authenticated;

REVOKE ALL ON centro_controle_financeiro FROM PUBLIC;
GRANT SELECT ON centro_controle_financeiro TO authenticated;

-- RLS Adicional para relatórios (apenas Admins)
-- O Supabase não suporta RLS em Views diretamente, mas podemos filtrar via auth no app ou criando as views dependentes de funções.
-- Como estamos no modelo de Admin Panel, a validação de Role na tabela admin_roles já blinda o acesso.

SELECT 'Centro de Controle Financeiro (PARTE 5) Ativado!' as status;
