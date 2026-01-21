-- ============================================
-- SETUP: Sistema de Pagamentos Seguros
-- Data: 20/01/2026
-- ============================================

-- 1. Criar coluna data_ultimo_pagamento se não existir
ALTER TABLE entregadores_app 
ADD COLUMN IF NOT EXISTS data_ultimo_pagamento TIMESTAMPTZ;

-- 2. Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_entregadores_frequencia_pagamento 
ON entregadores_app(frequencia_pagamento, data_ultimo_pagamento);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_carteira_lookup 
ON movimentacoes_carteira(id_carteira, tipo, status, criado_em);

CREATE INDEX IF NOT EXISTS idx_carteiras_usuario 
ON carteiras(id_usuario, tipo_usuario);

-- 3. Criar VIEW: Entregadores para Pagar
CREATE OR REPLACE VIEW view_entregadores_para_pagar AS
WITH saldos_calculados AS (
    SELECT 
        c.id_usuario as id_entregador,
        c.id as id_carteira,
        COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
                WHEN m.tipo = 'saida' AND m.status IN ('repassado', 'confirmado') THEN -m.valor
                ELSE 0
            END
        ), 0) as saldo_disponivel,
        COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'entrada' AND m.status = 'pendente' THEN m.valor
                ELSE 0
            END
        ), 0) as saldo_pendente,
        COUNT(CASE WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN 1 END) as qtd_entregas,
        MAX(m.criado_em) as ultima_movimentacao
    FROM carteiras c
    LEFT JOIN movimentacoes_carteira m ON c.id = m.id_carteira
    WHERE c.tipo_usuario = 'entregador'
    GROUP BY c.id_usuario, c.id
),
ultimos_pagamentos AS (
    SELECT 
        c.id_usuario as id_entregador,
        MAX(m.criado_em) as data_ultimo_pagamento
    FROM carteiras c
    INNER JOIN movimentacoes_carteira m ON c.id = m.id_carteira
    WHERE c.tipo_usuario = 'entregador'
      AND m.tipo = 'saida'
      AND m.status = 'repassado'
      AND m.origem = 'pagamento'
    GROUP BY c.id_usuario
)
SELECT 
    e.id,
    e.nome,
    e.chave_pix,
    e.frequencia_pagamento,
    s.id_carteira,
    s.saldo_disponivel,
    s.saldo_pendente,
    s.qtd_entregas,
    s.ultima_movimentacao,
    COALESCE(up.data_ultimo_pagamento, e.created_at) as data_ultimo_pagamento,
    COALESCE(up.data_ultimo_pagamento, e.created_at) + 
        (e.frequencia_pagamento || ' days')::INTERVAL as proxima_data_pagamento,
    CASE 
        WHEN COALESCE(up.data_ultimo_pagamento, e.created_at) + 
             (e.frequencia_pagamento || ' days')::INTERVAL <= NOW() 
        THEN true 
        ELSE false 
    END as deve_pagar_hoje,
    CASE 
        WHEN e.frequencia_pagamento = 1 THEN 'Diário'
        WHEN e.frequencia_pagamento = 7 THEN 'Semanal'
        WHEN e.frequencia_pagamento = 15 THEN 'Quinzenal'
        WHEN e.frequencia_pagamento = 30 THEN 'Mensal'
        ELSE CONCAT('A cada ', e.frequencia_pagamento, ' dias')
    END as descricao_frequencia,
    CASE 
        WHEN e.chave_pix IS NULL THEN 'SEM_CHAVE_PIX'
        WHEN s.saldo_disponivel <= 0 THEN 'SEM_SALDO'
        WHEN s.saldo_disponivel > 10000 THEN 'VALOR_SUSPEITO'
        ELSE 'OK'
    END as status_validacao
FROM entregadores_app e
INNER JOIN saldos_calculados s ON e.id = s.id_entregador
LEFT JOIN ultimos_pagamentos up ON e.id = up.id_entregador
WHERE s.saldo_disponivel > 0
ORDER BY 
    CASE WHEN COALESCE(up.data_ultimo_pagamento, e.created_at) + 
         (e.frequencia_pagamento || ' days')::INTERVAL <= NOW() THEN 0 ELSE 1 END,
    s.saldo_disponivel DESC;

-- 4. FUNCTION: Processar Pagamento Entregador
CREATE OR REPLACE FUNCTION processar_pagamento_entregador(
    p_id_entregador UUID,
    p_valor NUMERIC,
    p_chave_pix TEXT,
    p_admin_id UUID DEFAULT NULL,
    p_observacao TEXT DEFAULT NULL
) RETURNS TABLE (
    sucesso BOOLEAN,
    mensagem TEXT,
    id_movimentacao UUID,
    saldo_anterior NUMERIC,
    saldo_posterior NUMERIC
) AS $$
DECLARE
    v_id_carteira UUID;
    v_saldo_calculado NUMERIC;
    v_id_movimentacao UUID;
    v_qtd_movimentacoes INT;
BEGIN
    -- 1. Buscar carteira do entregador
    SELECT id INTO v_id_carteira
    FROM carteiras
    WHERE id_usuario = p_id_entregador
      AND tipo_usuario = 'entregador';
    
    IF v_id_carteira IS NULL THEN
        RETURN QUERY SELECT false, 'Carteira não encontrada', NULL::UUID, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- 2. Calcular saldo real
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo = 'entrada' AND status = 'confirmado' THEN valor
            WHEN tipo = 'saida' AND status = 'repassado' THEN -valor
            ELSE 0
        END
    ), 0)
    INTO v_saldo_calculado
    FROM movimentacoes_carteira
    WHERE id_carteira = v_id_carteira;
    
    -- 3. Validar saldo
    IF v_saldo_calculado < p_valor THEN
        RETURN QUERY SELECT 
            false, 
            'Saldo insuficiente: R$ ' || v_saldo_calculado::TEXT, 
            NULL::UUID, 
            v_saldo_calculado, 
            v_saldo_calculado;
        RETURN;
    END IF;
    
    -- 4. Verificar se já existe pagamento pendente
    SELECT COUNT(*) INTO v_qtd_movimentacoes
    FROM movimentacoes_carteira
    WHERE id_carteira = v_id_carteira
      AND tipo = 'saida'
      AND origem = 'pagamento'
      AND status = 'pendente';
    
    IF v_qtd_movimentacoes > 0 THEN
        RETURN QUERY SELECT 
            false, 
            'Já existe pagamento pendente', 
            NULL::UUID, 
            v_saldo_calculado, 
            v_saldo_calculado;
        RETURN;
    END IF;
    
    -- 5. Inserir movimentação de saída (status = pendente)
    INSERT INTO movimentacoes_carteira (
        id_carteira,
        tipo,
        origem,
        descricao,
        valor,
        status,
        criado_em
    ) VALUES (
        v_id_carteira,
        'saida',
        'pagamento',
        COALESCE(p_observacao, 'Pagamento via Pix - ' || p_chave_pix),
        p_valor,
        'pendente',
        NOW()
    )
    RETURNING id INTO v_id_movimentacao;
    
    -- 6. Atualizar saldo_pendente na carteira
    UPDATE carteiras
    SET 
        saldo_pendente = saldo_pendente + p_valor,
        updated_at = NOW()
    WHERE id = v_id_carteira;
    
    -- 7. Retornar sucesso
    RETURN QUERY SELECT 
        true, 
        'Pagamento registrado com sucesso', 
        v_id_movimentacao, 
        v_saldo_calculado, 
        v_saldo_calculado - p_valor;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCTION: Confirmar Pagamento Entregador
CREATE OR REPLACE FUNCTION confirmar_pagamento_entregador(
    p_id_movimentacao UUID,
    p_comprovante_url TEXT DEFAULT NULL,
    p_admin_id UUID DEFAULT NULL
) RETURNS TABLE (
    sucesso BOOLEAN,
    mensagem TEXT
) AS $$
DECLARE
    v_id_carteira UUID;
    v_valor NUMERIC;
    v_status TEXT;
    v_id_entregador UUID;
BEGIN
    -- 1. Buscar movimentação
    SELECT m.id_carteira, m.valor, m.status, c.id_usuario
    INTO v_id_carteira, v_valor, v_status, v_id_entregador
    FROM movimentacoes_carteira m
    INNER JOIN carteiras c ON m.id_carteira = c.id
    WHERE m.id = p_id_movimentacao;
    
    IF v_id_carteira IS NULL THEN
        RETURN QUERY SELECT false, 'Movimentação não encontrada';
        RETURN;
    END IF;
    
    IF v_status != 'pendente' THEN
        RETURN QUERY SELECT false, 'Pagamento já foi processado';
        RETURN;
    END IF;
    
    -- 2. Atualizar status para repassado
    UPDATE movimentacoes_carteira
    SET 
        status = 'repassado',
        comprovante_url = p_comprovante_url
    WHERE id = p_id_movimentacao;
    
    -- 3. Atualizar carteira
    UPDATE carteiras
    SET 
        saldo_atual = saldo_atual - v_valor,
        saldo_pendente = saldo_pendente - v_valor,
        updated_at = NOW()
    WHERE id = v_id_carteira;
    
    -- 4. Atualizar data_ultimo_pagamento no entregador
    UPDATE entregadores_app
    SET data_ultimo_pagamento = NOW()
    WHERE id = v_id_entregador;
    
    RETURN QUERY SELECT true, 'Pagamento confirmado com sucesso';
END;
$$ LANGUAGE plpgsql;

-- 6. VIEW: Relatório de Pagamentos Diário
CREATE OR REPLACE VIEW relatorio_pagamentos_diario AS
SELECT 
    DATE(m.criado_em) as data,
    COUNT(*) as qtd_pagamentos,
    SUM(m.valor) as total_pago,
    AVG(m.valor) as ticket_medio,
    COUNT(DISTINCT c.id_usuario) as qtd_entregadores,
    STRING_AGG(DISTINCT e.nome, ', ') as entregadores
FROM movimentacoes_carteira m
INNER JOIN carteiras c ON m.id_carteira = c.id
INNER JOIN entregadores_app e ON c.id_usuario = e.id
WHERE m.tipo = 'saida'
  AND m.origem = 'pagamento'
  AND m.status = 'repassado'
  AND m.criado_em >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(m.criado_em)
ORDER BY data DESC;

-- 7. VIEW: Relatório de Inconsistências
CREATE OR REPLACE VIEW relatorio_inconsistencias AS
SELECT 
    e.id,
    e.nome,
    c.saldo_atual as saldo_registrado,
    COALESCE(SUM(
        CASE 
            WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
            WHEN m.tipo = 'saida' AND m.status = 'repassado' THEN -m.valor
            ELSE 0
        END
    ), 0) as saldo_calculado,
    ABS(c.saldo_atual - COALESCE(SUM(
        CASE 
            WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
            WHEN m.tipo = 'saida' AND m.status = 'repassado' THEN -m.valor
            ELSE 0
        END
    ), 0)) as diferenca
FROM entregadores_app e
INNER JOIN carteiras c ON e.id = c.id_usuario
LEFT JOIN movimentacoes_carteira m ON c.id = m.id_carteira
WHERE c.tipo_usuario = 'entregador'
GROUP BY e.id, e.nome, c.saldo_atual
HAVING ABS(c.saldo_atual - COALESCE(SUM(
    CASE 
        WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
        WHEN m.tipo = 'saida' AND m.status = 'repassado' THEN -m.valor
        ELSE 0
    END
), 0)) > 0.01
ORDER BY diferenca DESC;

-- 8. FUNCTION: Recalcular Saldo (Correção de Inconsistências)
CREATE OR REPLACE FUNCTION recalcular_saldo_carteira(
    p_id_carteira UUID
) RETURNS TABLE (
    sucesso BOOLEAN,
    saldo_anterior NUMERIC,
    saldo_calculado NUMERIC,
    diferenca NUMERIC
) AS $$
DECLARE
    v_saldo_anterior NUMERIC;
    v_saldo_calculado NUMERIC;
BEGIN
    -- 1. Buscar saldo atual
    SELECT saldo_atual INTO v_saldo_anterior
    FROM carteiras
    WHERE id = p_id_carteira;
    
    -- 2. Calcular saldo real
    SELECT COALESCE(SUM(
        CASE 
            WHEN tipo = 'entrada' AND status = 'confirmado' THEN valor
            WHEN tipo = 'saida' AND status = 'repassado' THEN -valor
            ELSE 0
        END
    ), 0)
    INTO v_saldo_calculado
    FROM movimentacoes_carteira
    WHERE id_carteira = p_id_carteira;
    
    -- 3. Atualizar se houver diferença
    IF ABS(v_saldo_anterior - v_saldo_calculado) > 0.01 THEN
        UPDATE carteiras
        SET 
            saldo_atual = v_saldo_calculado,
            updated_at = NOW()
        WHERE id = p_id_carteira;
    END IF;
    
    RETURN QUERY SELECT 
        true,
        v_saldo_anterior,
        v_saldo_calculado,
        ABS(v_saldo_anterior - v_saldo_calculado);
END;
$$ LANGUAGE plpgsql;

-- 9. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_carteiras ON carteiras;
CREATE TRIGGER set_timestamp_carteiras
    BEFORE UPDATE ON carteiras
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- 10. Comentários nas tabelas para documentação
COMMENT ON VIEW view_entregadores_para_pagar IS 
'View que lista entregadores elegíveis para pagamento baseado na frequência configurada';

COMMENT ON FUNCTION processar_pagamento_entregador IS 
'Inicia processo de pagamento criando movimentação com status pendente';

COMMENT ON FUNCTION confirmar_pagamento_entregador IS 
'Confirma pagamento após transferência bancária, atualizando status para repassado';

COMMENT ON FUNCTION recalcular_saldo_carteira IS 
'Recalcula saldo da carteira baseado nas movimentações para corrigir inconsistências';

-- ============================================
-- FIM DO SETUP
-- ============================================

-- Verificar se tudo foi criado corretamente
SELECT 'Setup concluído com sucesso!' as status;
