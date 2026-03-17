-- =================================================================
-- FIX V5: Busca Robusta de Carteira (Fix Erro 'Não encontrada')
-- =================================================================

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
    -- 1. Identificar Usuário
    IF p_id_restaurante IS NOT NULL THEN
        v_id_usuario := p_id_restaurante;
        v_tipo_usuario := 'restaurante';
    ELSE
        v_id_usuario := p_id_usuario;
        v_tipo_usuario := p_tipo_usuario;
    END IF;

    -- 2. BUSCA ROBUSTA: Pelo ID do usuário (Unique)
    -- Isso evita erros se o tipo vier com casing diferente ou se houver inconsistência
    SELECT id INTO v_id_carteira 
    FROM carteiras 
    WHERE id_usuario = v_id_usuario 
    LIMIT 1;

    -- 3. Fallback: Se realmente não existir, cria (Lazy Creation)
    IF v_id_carteira IS NULL THEN
        INSERT INTO carteiras (
            id_usuario, 
            tipo_usuario, 
            saldo_atual, 
            saldo_pendente, 
            created_at, 
            updated_at
        ) VALUES (
            v_id_usuario, 
            v_tipo_usuario, 
            0, 
            0, 
            NOW(), 
            NOW()
        )
        RETURNING id INTO v_id_carteira;
    END IF;

    -- 4. Registrar Pagamento (Saída)
    -- Usa id_carteira garantido (existente ou novo)
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
        'pagamento',
        COALESCE(p_observacao, 'Pagamento manual via Dashboard'),
        p_valor,
        'pago', 
        p_comprovante_url,
        NOW()
    );

    -- 5. Atualizar Saldos
    UPDATE carteiras
    SET 
        saldo_atual = saldo_atual - p_valor,
        saldo_pendente = saldo_pendente - p_valor,
        updated_at = NOW()
    WHERE id = v_id_carteira;

    -- 6. Legado (Apenas Restaurantes)
    IF v_tipo_usuario = 'restaurante' THEN
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
