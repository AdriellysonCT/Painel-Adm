-- =================================================================
-- FIX V2: Sincronização de Pagamentos (Corrigindo esquema de colunas)
-- =================================================================

-- 1. Atualizar VIEW para considerar status 'pago' e 'repassado'
CREATE OR REPLACE VIEW view_entregadores_para_pagar AS
WITH saldos_calculados AS (
    SELECT 
        c.id_usuario as id_entregador,
        c.id as id_carteira,
        COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
                -- CORREÇÃO: Aceitar 'pago' e 'repassado' como débito
                WHEN m.tipo = 'saida' AND m.status IN ('repassado', 'confirmado', 'pago') THEN -m.valor
                ELSE 0
            END
        ), 0) as saldo_disponivel,
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
      AND m.status IN ('repassado', 'pago') -- Status de pagamento
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
WHERE s.saldo_disponivel > 0;

-- 2. Função Corrigida: Remover colunas inexistentes (id_usuario, tipo_usuario) da tabela de movimentações
CREATE OR REPLACE FUNCTION confirmar_repasso_manual(
    p_id_restaurante UUID DEFAULT NULL,
    p_id_usuario UUID DEFAULT NULL,
    p_tipo_usuario TEXT DEFAULT 'restaurante',
    p_valor DECIMAL DEFAULT 0,
    p_comprovante_url TEXT DEFAULT NULL,
    p_observacao TEXT DEFAULT NULL,
    p_admin_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_id_usuario UUID;
    v_tipo_usuario TEXT;
    v_id_carteira UUID;
BEGIN
    -- Normalizar Input
    IF p_id_restaurante IS NOT NULL THEN
        v_id_usuario := p_id_restaurante;
        v_tipo_usuario := 'restaurante';
    ELSE
        v_id_usuario := p_id_usuario;
        v_tipo_usuario := p_tipo_usuario;
    END IF;

    -- Lógica para Entregadores (Carteira Obrigatória)
    IF v_tipo_usuario = 'entregador' THEN
        -- Buscar carteira
        SELECT id INTO v_id_carteira FROM carteiras WHERE id_usuario = v_id_usuario AND tipo_usuario = 'entregador';
        
        IF v_id_carteira IS NULL THEN
            RAISE EXCEPTION 'Carteira não encontrada para o usuário %', v_id_usuario;
        END IF;

        -- Inserir Movimentação de Saída (Usando APENAS colunas válidas)
        INSERT INTO movimentacoes_carteira (
            id_carteira,       -- Chave estrangeira correta
            tipo,
            origem,
            descricao,
            valor,
            status,
            comprovante_url,
            criado_em
        ) VALUES (
            v_id_carteira,
            'saida',
            'pagamento',
            COALESCE(p_observacao, 'Pagamento manual via Dashboard'),
            p_valor,
            'pago',          -- status unificado
            p_comprovante_url,
            NOW()
        );

        -- Atualizar cache da carteira
        UPDATE carteiras
        SET 
            saldo_atual = saldo_atual - p_valor,
            saldo_pendente = saldo_pendente - p_valor,
            updated_at = NOW()
        WHERE id = v_id_carteira;

    -- Lógica para Restaurantes (Híbrida: Tenta carteira, fallback para legada se necessário)
    ELSIF v_tipo_usuario = 'restaurante' THEN
        -- Tentar achar carteira de restaurante
        SELECT id INTO v_id_carteira FROM carteiras WHERE id_usuario = v_id_usuario AND tipo_usuario = 'restaurante';

        IF v_id_carteira IS NOT NULL THEN
             INSERT INTO movimentacoes_carteira (
                id_carteira,
                tipo,
                origem,
                descricao,
                valor,
                status,
                comprovante_url,
                criado_em
            ) VALUES (
                v_id_carteira,
                'saida',
                'repasse',
                COALESCE(p_observacao, 'Repasse manual'),
                p_valor,
                'pago',
                p_comprovante_url,
                NOW()
            );
            
            UPDATE carteiras
            SET 
                saldo_atual = saldo_atual - p_valor,
                updated_at = NOW()
            WHERE id = v_id_carteira;
        ELSE
            -- Fallback: Se não tem carteira (sistema antigo puro), usa a tabela antiga se ainda existir
            -- Mas o erro indica que movimentacoes_carteira foi migrada. 
            -- Vamos assumir que restaurante deve ter carteira ou criar uma na hora.
            
            -- Criar carteira on-the-fly se não existir (Opcional, mas seguro)
            INSERT INTO carteiras (id_usuario, tipo_usuario, saldo_atual) VALUES (v_id_usuario, 'restaurante', 0) RETURNING id INTO v_id_carteira;
            
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
                'repasse',
                COALESCE(p_observacao, 'Repasse manual'),
                p_valor,
                'pago',
                NOW()
            );
        END IF;

        -- Manter compatibilidade com tabela de repasses antiga
        UPDATE repasses_restaurantes
        SET 
            total_repassado = total_repassado + p_valor,
            saldo_pendente = saldo_pendente - p_valor,
            ultima_atualizacao = NOW()
        WHERE id_restaurante = v_id_usuario;

        INSERT INTO historico_repasses (id_restaurante, id_admin, valor, metodo, comprovante_url, observacao)
        VALUES (v_id_usuario, p_admin_id, p_valor, 'manual', p_comprovante_url, p_observacao);
    END IF;
END;
$$ LANGUAGE plpgsql;
