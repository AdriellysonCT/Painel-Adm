-- ============================================
-- SCRIPT DE SETUP DO BANCO DE DADOS SUPABASE
-- FomeNinja - Painel Administrativo
-- ============================================

-- 1. Criar tabela de restaurantes (se não existir)
CREATE TABLE IF NOT EXISTS restaurantes_app (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_fantasia TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de entregadores (se não existir)
CREATE TABLE IF NOT EXISTS entregadores_app (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de movimentações de carteira
CREATE TABLE IF NOT EXISTS movimentacoes_carteira (
    id_movimentacao UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL,
    tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('restaurante', 'entregador')),
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    origem TEXT,
    referencia_id UUID,
    descricao TEXT,
    valor DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'pago', 'cancelado')),
    comprovante_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar view de extrato de carteira
CREATE OR REPLACE VIEW view_extrato_carteira AS
SELECT 
    m.id_movimentacao,
    m.id_usuario,
    m.tipo_usuario,
    m.tipo,
    m.origem,
    m.referencia_id,
    m.descricao,
    m.valor,
    m.status,
    m.comprovante_url,
    m.criado_em,
    CASE 
        WHEN m.tipo_usuario = 'restaurante' THEN r.nome_fantasia
        WHEN m.tipo_usuario = 'entregador' THEN e.nome
    END as nome_entidade
FROM movimentacoes_carteira m
LEFT JOIN restaurantes_app r ON m.id_usuario = r.id AND m.tipo_usuario = 'restaurante'
LEFT JOIN entregadores_app e ON m.id_usuario = e.id AND m.tipo_usuario = 'entregador';

-- 5. Criar tabela de repasses por restaurante (materializada ou view)
CREATE TABLE IF NOT EXISTS repasses_restaurantes (
    id_restaurante UUID PRIMARY KEY,
    total_vendas_confirmadas DECIMAL(10, 2) DEFAULT 0,
    total_repassado DECIMAL(10, 2) DEFAULT 0,
    saldo_pendente DECIMAL(10, 2) DEFAULT 0,
    ultima_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar tabela de histórico de repasses
CREATE TABLE IF NOT EXISTS historico_repasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_restaurante UUID REFERENCES restaurantes_app(id),
    id_admin UUID,
    valor DECIMAL(10, 2) NOT NULL,
    data_repasse TIMESTAMPTZ DEFAULT NOW(),
    metodo TEXT,
    comprovante_url TEXT,
    observacao TEXT
);

-- 7. Criar tabela de falhas de repasses
CREATE TABLE IF NOT EXISTS falhas_repasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repasse_id UUID,
    tipo_falha TEXT,
    descricao_erro TEXT,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido')),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DADOS DE TESTE
-- ============================================

-- Inserir restaurantes de teste
INSERT INTO restaurantes_app (id, nome_fantasia, email, telefone) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Pizzaria Bella Napoli', 'contato@bellanapoli.com', '(11) 98765-4321'),
    ('22222222-2222-2222-2222-222222222222', 'Hamburgueria Top Burger', 'contato@topburger.com', '(11) 98765-4322'),
    ('33333333-3333-3333-3333-333333333333', 'Sushi House', 'contato@sushihouse.com', '(11) 98765-4323'),
    ('44444444-4444-4444-4444-444444444444', 'Churrascaria Gaúcha', 'contato@gaucha.com', '(11) 98765-4324'),
    ('55555555-5555-5555-5555-555555555555', 'Restaurante Vegano Verde', 'contato@verde.com', '(11) 98765-4325')
ON CONFLICT (id) DO NOTHING;

-- Inserir entregadores de teste
INSERT INTO entregadores_app (id, nome, email, telefone) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'João Silva', 'joao@email.com', '(11) 91234-5678'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Maria Santos', 'maria@email.com', '(11) 91234-5679'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pedro Oliveira', 'pedro@email.com', '(11) 91234-5680'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Ana Costa', 'ana@email.com', '(11) 91234-5681'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Carlos Souza', 'carlos@email.com', '(11) 91234-5682')
ON CONFLICT (id) DO NOTHING;

-- Inserir movimentações de teste para restaurantes
INSERT INTO movimentacoes_carteira (id_usuario, tipo_usuario, tipo, origem, descricao, valor, status) VALUES
    -- Pizzaria Bella Napoli
    ('11111111-1111-1111-1111-111111111111', 'restaurante', 'entrada', 'pedido', 'Pedido #1001 - Pizza Margherita', 85.00, 'confirmado'),
    ('11111111-1111-1111-1111-111111111111', 'restaurante', 'entrada', 'pedido', 'Pedido #1002 - Pizza Calabresa', 75.00, 'confirmado'),
    ('11111111-1111-1111-1111-111111111111', 'restaurante', 'saida', 'repasse', 'Repasse semanal', 120.00, 'pendente'),
    
    -- Hamburgueria Top Burger
    ('22222222-2222-2222-2222-222222222222', 'restaurante', 'entrada', 'pedido', 'Pedido #2001 - Burger Clássico', 45.00, 'confirmado'),
    ('22222222-2222-2222-2222-222222222222', 'restaurante', 'entrada', 'pedido', 'Pedido #2002 - Burger Bacon', 55.00, 'confirmado'),
    ('22222222-2222-2222-2222-222222222222', 'restaurante', 'saida', 'repasse', 'Repasse semanal', 80.00, 'pendente'),
    
    -- Sushi House
    ('33333333-3333-3333-3333-333333333333', 'restaurante', 'entrada', 'pedido', 'Pedido #3001 - Combo Sushi', 120.00, 'confirmado'),
    ('33333333-3333-3333-3333-333333333333', 'restaurante', 'entrada', 'pedido', 'Pedido #3002 - Sashimi', 95.00, 'confirmado'),
    ('33333333-3333-3333-3333-333333333333', 'restaurante', 'saida', 'repasse', 'Repasse semanal', 150.00, 'pago'),
    
    -- Churrascaria Gaúcha
    ('44444444-4444-4444-4444-444444444444', 'restaurante', 'entrada', 'pedido', 'Pedido #4001 - Rodízio', 180.00, 'confirmado'),
    ('44444444-4444-4444-4444-444444444444', 'restaurante', 'saida', 'repasse', 'Repasse semanal', 150.00, 'pendente'),
    
    -- Restaurante Vegano Verde
    ('55555555-5555-5555-5555-555555555555', 'restaurante', 'entrada', 'pedido', 'Pedido #5001 - Salada Completa', 35.00, 'confirmado'),
    ('55555555-5555-5555-5555-555555555555', 'restaurante', 'entrada', 'pedido', 'Pedido #5002 - Bowl Vegano', 42.00, 'confirmado'),
    ('55555555-5555-5555-5555-555555555555', 'restaurante', 'saida', 'repasse', 'Repasse semanal', 60.00, 'pendente')
ON CONFLICT DO NOTHING;

-- Inserir movimentações de teste para entregadores
INSERT INTO movimentacoes_carteira (id_usuario, tipo_usuario, tipo, origem, descricao, valor, status) VALUES
    -- João Silva
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'entregador', 'entrada', 'entrega', 'Entrega #E1001', 12.00, 'confirmado'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'entregador', 'entrada', 'entrega', 'Entrega #E1002', 15.00, 'confirmado'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'entregador', 'saida', 'repasse', 'Pagamento semanal', 25.00, 'pendente'),
    
    -- Maria Santos
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'entregador', 'entrada', 'entrega', 'Entrega #E2001', 10.00, 'confirmado'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'entregador', 'entrada', 'entrega', 'Entrega #E2002', 18.00, 'confirmado'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'entregador', 'saida', 'repasse', 'Pagamento semanal', 20.00, 'pendente'),
    
    -- Pedro Oliveira
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'entregador', 'entrada', 'entrega', 'Entrega #E3001', 14.00, 'confirmado'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'entregador', 'saida', 'repasse', 'Pagamento semanal', 12.00, 'pago')
ON CONFLICT DO NOTHING;

-- Atualizar tabela de repasses_restaurantes
INSERT INTO repasses_restaurantes (id_restaurante, total_vendas_confirmadas, total_repassado, saldo_pendente)
SELECT 
    id_usuario as id_restaurante,
    SUM(CASE WHEN tipo = 'entrada' AND status = 'confirmado' THEN valor ELSE 0 END) as total_vendas_confirmadas,
    SUM(CASE WHEN tipo = 'saida' AND status = 'pago' THEN valor ELSE 0 END) as total_repassado,
    SUM(CASE WHEN tipo = 'entrada' AND status = 'confirmado' THEN valor ELSE 0 END) - 
    SUM(CASE WHEN tipo = 'saida' AND status IN ('pago', 'pendente') THEN valor ELSE 0 END) as saldo_pendente
FROM movimentacoes_carteira
WHERE tipo_usuario = 'restaurante'
GROUP BY id_usuario
ON CONFLICT (id_restaurante) DO UPDATE SET
    total_vendas_confirmadas = EXCLUDED.total_vendas_confirmadas,
    total_repassado = EXCLUDED.total_repassado,
    saldo_pendente = EXCLUDED.saldo_pendente,
    ultima_atualizacao = NOW();

-- ============================================
-- FUNCTION PARA CONFIRMAR REPASSE MANUAL
-- ============================================

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
BEGIN
    -- Determinar id_usuario e tipo_usuario
    IF p_id_restaurante IS NOT NULL THEN
        v_id_usuario := p_id_restaurante;
        v_tipo_usuario := 'restaurante';
    ELSE
        v_id_usuario := p_id_usuario;
        v_tipo_usuario := p_tipo_usuario;
    END IF;

    -- Atualizar movimentações pendentes para pago
    UPDATE movimentacoes_carteira
    SET status = 'pago'
    WHERE id_usuario = v_id_usuario
      AND tipo_usuario = v_tipo_usuario
      AND tipo = 'saida'
      AND status = 'pendente'
      AND valor <= p_valor;

    -- Registrar no histórico (apenas para restaurantes)
    IF v_tipo_usuario = 'restaurante' THEN
        INSERT INTO historico_repasses (id_restaurante, id_admin, valor, metodo, comprovante_url, observacao)
        VALUES (v_id_usuario, p_admin_id, p_valor, 'manual', p_comprovante_url, p_observacao);
        
        -- Atualizar repasses_restaurantes
        UPDATE repasses_restaurantes
        SET 
            total_repassado = total_repassado + p_valor,
            saldo_pendente = saldo_pendente - p_valor,
            ultima_atualizacao = NOW()
        WHERE id_restaurante = v_id_usuario;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISSÕES (ajuste conforme necessário)
-- ============================================

-- Permitir acesso anônimo para leitura (ajuste conforme sua política de segurança)
ALTER TABLE restaurantes_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregadores_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_carteira ENABLE ROW LEVEL SECURITY;
ALTER TABLE repasses_restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_repasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE falhas_repasses ENABLE ROW LEVEL SECURITY;

-- Política permissiva para desenvolvimento (REMOVER EM PRODUÇÃO!)
CREATE POLICY "Allow all for development" ON restaurantes_app FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON entregadores_app FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON movimentacoes_carteira FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON repasses_restaurantes FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON historico_repasses FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON falhas_repasses FOR ALL USING (true);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
