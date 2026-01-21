-- ============================================
-- DADOS DE TESTE: Sistema de Pagamentos
-- Use este script para popular o banco com dados de teste
-- ============================================

-- 1. Atualizar entregadores existentes com chaves Pix e frequências
UPDATE entregadores_app 
SET 
    chave_pix = CASE 
        WHEN nome LIKE '%João%' THEN '11987654321'
        WHEN nome LIKE '%Maria%' THEN 'maria@email.com'
        WHEN nome LIKE '%Pedro%' THEN '12345678900'
        WHEN nome LIKE '%Ana%' THEN 'ana.costa@pix.com'
        WHEN nome LIKE '%Carlos%' THEN '98765432100'
        WHEN nome LIKE '%Lucas%' THEN 'lucas@pix.com'
        ELSE CONCAT(SUBSTRING(MD5(RANDOM()::TEXT), 1, 11))
    END,
    frequencia_pagamento = CASE 
        WHEN nome LIKE '%João%' THEN 1  -- Diário
        WHEN nome LIKE '%Maria%' THEN 1  -- Diário
        WHEN nome LIKE '%Pedro%' THEN 5  -- A cada 5 dias
        WHEN nome LIKE '%Ana%' THEN 7    -- Semanal
        WHEN nome LIKE '%Carlos%' THEN 15 -- Quinzenal
        ELSE 1  -- Diário por padrão
    END,
    data_ultimo_pagamento = CASE 
        -- Alguns já receberam recentemente, outros não
        WHEN nome LIKE '%João%' THEN NOW() - INTERVAL '2 days'  -- Deve receber hoje
        WHEN nome LIKE '%Maria%' THEN NOW() - INTERVAL '1 day'  -- Deve receber hoje
        WHEN nome LIKE '%Pedro%' THEN NOW() - INTERVAL '3 days' -- Ainda não
        WHEN nome LIKE '%Ana%' THEN NOW() - INTERVAL '8 days'   -- Deve receber hoje
        ELSE NOW() - INTERVAL '1 day'
    END
WHERE id IN (
    SELECT id FROM entregadores_app LIMIT 10
);

-- 2. Garantir que todos os entregadores têm carteiras
INSERT INTO carteiras (id_usuario, tipo_usuario, saldo_atual, saldo_pendente)
SELECT id, 'entregador', 0, 0
FROM entregadores_app
WHERE id NOT IN (
    SELECT id_usuario FROM carteiras WHERE tipo_usuario = 'entregador'
)
ON CONFLICT DO NOTHING;

-- 3. Adicionar movimentações de entrada (ganhos de entregas)
-- Entregador 1: João (Diário - deve receber hoje)
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    tipo_pedido,
    criado_em
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Entrega #' || generate_series || ' - Pedido concluído',
    (RANDOM() * 20 + 10)::NUMERIC(10,2),  -- Entre R$10 e R$30
    'confirmado',
    'entrega',
    NOW() - (generate_series || ' hours')::INTERVAL
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
CROSS JOIN generate_series(1, 8)  -- 8 entregas
WHERE e.nome LIKE '%João%'
  AND c.tipo_usuario = 'entregador'
LIMIT 8;

-- Entregador 2: Maria (Diário - deve receber hoje)
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    tipo_pedido,
    criado_em
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Entrega #' || generate_series || ' - Pedido concluído',
    (RANDOM() * 15 + 12)::NUMERIC(10,2),
    'confirmado',
    'entrega',
    NOW() - (generate_series || ' hours')::INTERVAL
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
CROSS JOIN generate_series(1, 6)  -- 6 entregas
WHERE e.nome LIKE '%Maria%'
  AND c.tipo_usuario = 'entregador'
LIMIT 6;

-- Entregador 3: Pedro (A cada 5 dias - ainda não deve receber)
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    tipo_pedido,
    criado_em
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Entrega #' || generate_series || ' - Pedido concluído',
    (RANDOM() * 25 + 15)::NUMERIC(10,2),
    'confirmado',
    'entrega',
    NOW() - (generate_series || ' hours')::INTERVAL
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
CROSS JOIN generate_series(1, 12)  -- 12 entregas
WHERE e.nome LIKE '%Pedro%'
  AND c.tipo_usuario = 'entregador'
LIMIT 12;

-- Entregador 4: Ana (Semanal - deve receber hoje)
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    tipo_pedido,
    criado_em
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Entrega #' || generate_series || ' - Pedido concluído',
    (RANDOM() * 18 + 10)::NUMERIC(10,2),
    'confirmado',
    'entrega',
    NOW() - (generate_series || ' hours')::INTERVAL
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
CROSS JOIN generate_series(1, 15)  -- 15 entregas
WHERE e.nome LIKE '%Ana%'
  AND c.tipo_usuario = 'entregador'
LIMIT 15;

-- 4. Adicionar um entregador com valor suspeito (>R$10.000) para testar alerta
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    tipo_pedido,
    criado_em
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Acúmulo de 30 dias - Teste de alerta',
    12500.00,
    'confirmado',
    'entrega',
    NOW() - INTERVAL '1 hour'
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
WHERE e.nome LIKE '%Carlos%'
  AND c.tipo_usuario = 'entregador'
LIMIT 1;

-- 5. Adicionar um entregador SEM chave Pix para testar alerta
UPDATE entregadores_app 
SET chave_pix = NULL
WHERE nome LIKE '%Sung%'
  OR nome LIKE '%Cloud%';

-- Adicionar saldo para eles
INSERT INTO movimentacoes_carteira (
    id_carteira,
    tipo,
    origem,
    descricao,
    valor,
    status,
    tipo_pedido,
    criado_em
)
SELECT 
    c.id,
    'entrada',
    'entrega',
    'Entrega sem chave Pix - Teste de alerta',
    45.00,
    'confirmado',
    'entrega',
    NOW() - INTERVAL '2 hours'
FROM carteiras c
INNER JOIN entregadores_app e ON c.id_usuario = e.id
WHERE e.chave_pix IS NULL
  AND c.tipo_usuario = 'entregador'
LIMIT 2;

-- 6. Recalcular saldos de todas as carteiras
UPDATE carteiras c
SET saldo_atual = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
            WHEN m.tipo = 'saida' AND m.status = 'repassado' THEN -m.valor
            ELSE 0
        END
    ), 0)
    FROM movimentacoes_carteira m
    WHERE m.id_carteira = c.id
)
WHERE tipo_usuario = 'entregador';

-- 7. Verificar resultados
SELECT 
    '✅ Dados de teste criados com sucesso!' as status,
    COUNT(*) as total_entregadores,
    COUNT(*) FILTER (WHERE chave_pix IS NOT NULL) as com_chave_pix,
    COUNT(*) FILTER (WHERE chave_pix IS NULL) as sem_chave_pix
FROM entregadores_app;

-- 8. Ver preview dos entregadores para pagar
SELECT 
    nome,
    chave_pix,
    frequencia_pagamento,
    descricao_frequencia,
    saldo_disponivel,
    deve_pagar_hoje,
    status_validacao
FROM view_entregadores_para_pagar
ORDER BY deve_pagar_hoje DESC, saldo_disponivel DESC;

-- ============================================
-- QUERIES ÚTEIS PARA TESTES
-- ============================================

-- Ver todas as movimentações de um entregador
-- SELECT * FROM movimentacoes_carteira m
-- INNER JOIN carteiras c ON m.id_carteira = c.id
-- INNER JOIN entregadores_app e ON c.id_usuario = e.id
-- WHERE e.nome LIKE '%João%'
-- ORDER BY m.criado_em DESC;

-- Ver saldos de todos os entregadores
-- SELECT 
--     e.nome,
--     e.chave_pix,
--     c.saldo_atual,
--     c.saldo_pendente
-- FROM entregadores_app e
-- INNER JOIN carteiras c ON e.id = c.id_usuario
-- WHERE c.tipo_usuario = 'entregador'
-- ORDER BY c.saldo_atual DESC;

-- Limpar todos os dados de teste (CUIDADO!)
-- DELETE FROM movimentacoes_carteira 
-- WHERE id_carteira IN (
--     SELECT id FROM carteiras WHERE tipo_usuario = 'entregador'
-- );
-- UPDATE carteiras SET saldo_atual = 0, saldo_pendente = 0 
-- WHERE tipo_usuario = 'entregador';
