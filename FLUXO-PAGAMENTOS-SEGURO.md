# 💰 Fluxo de Pagamentos Seguro - Sistema de Carteira

## 🎯 Objetivo

Criar um sistema robusto, auditável e à prova de erros para pagamentos de entregadores, garantindo que:
- ✅ Nenhum pagamento seja perdido
- ✅ Nenhum pagamento seja duplicado
- ✅ Todo pagamento seja rastreável
- ✅ Erros sejam detectados antes de causar danos
- ✅ Haja auditoria completa de todas as operações

---

## 📊 Estrutura Atual do Banco de Dados

### Tabelas Principais:

**1. `entregadores_app`**
- `id` (UUID)
- `nome` (TEXT)
- `chave_pix` (TEXT) - ✅ JÁ EXISTE
- `frequencia_pagamento` (INT, Default 1) - ✅ JÁ EXISTE
- `created_at` (TIMESTAMPTZ)

**2. `carteiras`**
- `id` (UUID)
- `id_usuario` (UUID) - FK para entregadores_app.id
- `tipo_usuario` (TEXT) - 'entregador'
- `saldo_atual` (NUMERIC) - Saldo disponível para saque
- `saldo_pendente` (NUMERIC) - Saldo em processamento
- `created_at`, `updated_at`

**3. `movimentacoes_carteira`**
- `id` (UUID)
- `id_carteira` (UUID) - FK para carteiras.id
- `tipo` (TEXT) - 'entrada' ou 'saida'
- `origem` (TEXT) - 'entrega', 'bonus', 'pagamento', etc
- `referencia_id` (UUID) - ID da entrega/pedido
- `descricao` (TEXT)
- `valor` (NUMERIC)
- `status` (TEXT) - 'pendente', 'confirmado', 'repassado', 'cancelado'
- `comprovante_url` (TEXT)
- `criado_em` (TIMESTAMPTZ)
- `tipo_pedido` (TEXT) - 'entrega', 'retirada', 'local'

---

## 🔐 Princípios de Segurança Financeira

### 1. **Imutabilidade de Registros**
- Nunca deletar movimentações
- Usar status para cancelamentos
- Manter histórico completo

### 2. **Dupla Verificação**
- Calcular saldo sempre a partir das movimentações
- Nunca confiar apenas no campo `saldo_atual`
- Validar antes e depois de cada operação

### 3. **Auditoria Completa**
- Registrar quem fez a operação
- Registrar quando foi feita
- Registrar IP e contexto
- Manter logs imutáveis

### 4. **Transações Atômicas**
- Todas as operações financeiras em transações
- Rollback automático em caso de erro
- Validações antes do commit

---

## 🔄 Fluxo Completo de Pagamento

### **FASE 1: Identificação de Entregadores Elegíveis**

#### SQL: View de Entregadores para Pagar

```sql
CREATE OR REPLACE VIEW view_entregadores_para_pagar AS
WITH saldos_calculados AS (
    -- Calcular saldo real a partir das movimentações
    SELECT 
        c.id_usuario as id_entregador,
        c.id as id_carteira,
        -- Saldo disponível = entradas confirmadas - saídas repassadas
        COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN m.valor
                WHEN m.tipo = 'saida' AND m.status IN ('repassado', 'confirmado') THEN -m.valor
                ELSE 0
            END
        ), 0) as saldo_disponivel,
        -- Saldo pendente = entradas pendentes
        COALESCE(SUM(
            CASE 
                WHEN m.tipo = 'entrada' AND m.status = 'pendente' THEN m.valor
                ELSE 0
            END
        ), 0) as saldo_pendente,
        -- Total de entregas confirmadas
        COUNT(CASE WHEN m.tipo = 'entrada' AND m.status = 'confirmado' THEN 1 END) as qtd_entregas,
        -- Última movimentação
        MAX(m.criado_em) as ultima_movimentacao
    FROM carteiras c
    LEFT JOIN movimentacoes_carteira m ON c.id = m.id_carteira
    WHERE c.tipo_usuario = 'entregador'
    GROUP BY c.id_usuario, c.id
),
ultimos_pagamentos AS (
    -- Buscar data do último pagamento
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
    -- Calcular próxima data de pagamento
    COALESCE(up.data_ultimo_pagamento, e.created_at) + 
        (e.frequencia_pagamento || ' days')::INTERVAL as proxima_data_pagamento,
    -- Verificar se deve pagar hoje
    CASE 
        WHEN COALESCE(up.data_ultimo_pagamento, e.created_at) + 
             (e.frequencia_pagamento || ' days')::INTERVAL <= NOW() 
        THEN true 
        ELSE false 
    END as deve_pagar_hoje,
    -- Descrição da frequência
    CASE 
        WHEN e.frequencia_pagamento = 1 THEN 'Diário'
        WHEN e.frequencia_pagamento = 7 THEN 'Semanal'
        WHEN e.frequencia_pagamento = 15 THEN 'Quinzenal'
        WHEN e.frequencia_pagamento = 30 THEN 'Mensal'
        ELSE CONCAT('A cada ', e.frequencia_pagamento, ' dias')
    END as descricao_frequencia,
    -- Validações de segurança
    CASE 
        WHEN e.chave_pix IS NULL THEN 'SEM_CHAVE_PIX'
        WHEN s.saldo_disponivel <= 0 THEN 'SEM_SALDO'
        WHEN s.saldo_disponivel > 10000 THEN 'VALOR_SUSPEITO'
        ELSE 'OK'
    END as status_validacao
FROM entregadores_app e
INNER JOIN saldos_calculados s ON e.id = s.id_entregador
LEFT JOIN ultimos_pagamentos up ON e.id = up.id_entregador
WHERE s.saldo_disponivel > 0  -- Apenas com saldo positivo
ORDER BY 
    CASE WHEN COALESCE(up.data_ultimo_pagamento, e.created_at) + 
         (e.frequencia_pagamento || ' days')::INTERVAL <= NOW() THEN 0 ELSE 1 END,
    s.saldo_disponivel DESC;
```

---

### **FASE 2: Validações Pré-Pagamento**

#### Checklist de Validações:

```typescript
interface ValidacaoPagamento {
    id_entregador: string
    nome: string
    chave_pix: string
    valor: number
    id_carteira: string
}

async function validarPagamento(dados: ValidacaoPagamento): Promise<{
    valido: boolean
    erros: string[]
    avisos: string[]
}> {
    const erros: string[] = []
    const avisos: string[] = []
    
    // 1. Validar chave Pix
    if (!dados.chave_pix || dados.chave_pix.trim() === '') {
        erros.push('Chave Pix não cadastrada')
    }
    
    // 2. Validar valor
    if (dados.valor <= 0) {
        erros.push('Valor deve ser maior que zero')
    }
    
    if (dados.valor > 10000) {
        avisos.push(`Valor alto: R$ ${dados.valor.toFixed(2)} - Confirme se está correto`)
    }
    
    // 3. Verificar se já existe pagamento pendente
    const { data: pagamentoPendente } = await supabase
        .from('movimentacoes_carteira')
        .select('id')
        .eq('id_carteira', dados.id_carteira)
        .eq('tipo', 'saida')
        .eq('origem', 'pagamento')
        .eq('status', 'pendente')
        .single()
    
    if (pagamentoPendente) {
        erros.push('Já existe um pagamento pendente para este entregador')
    }
    
    // 4. Recalcular saldo em tempo real
    const { data: movimentacoes } = await supabase
        .from('movimentacoes_carteira')
        .select('tipo, valor, status')
        .eq('id_carteira', dados.id_carteira)
    
    const saldoCalculado = movimentacoes?.reduce((acc, mov) => {
        if (mov.tipo === 'entrada' && mov.status === 'confirmado') {
            return acc + parseFloat(mov.valor)
        }
        if (mov.tipo === 'saida' && mov.status === 'repassado') {
            return acc - parseFloat(mov.valor)
        }
        return acc
    }, 0) || 0
    
    if (saldoCalculado < dados.valor) {
        erros.push(`Saldo insuficiente. Disponível: R$ ${saldoCalculado.toFixed(2)}`)
    }
    
    if (Math.abs(saldoCalculado - dados.valor) > 0.01) {
        avisos.push(`Diferença entre saldo e valor: R$ ${(saldoCalculado - dados.valor).toFixed(2)}`)
    }
    
    // 5. Verificar se entregador existe
    const { data: entregador } = await supabase
        .from('entregadores_app')
        .select('id, nome')
        .eq('id', dados.id_entregador)
        .single()
    
    if (!entregador) {
        erros.push('Entregador não encontrado')
    }
    
    return {
        valido: erros.length === 0,
        erros,
        avisos
    }
}
```

---

### **FASE 3: Registro do Pagamento**

#### SQL: Function de Pagamento Seguro

```sql
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
        'pendente',  -- Inicia como pendente
        NOW()
    )
    RETURNING id INTO v_id_movimentacao;
    
    -- 6. Atualizar saldo_pendente na carteira
    UPDATE carteiras
    SET 
        saldo_pendente = saldo_pendente + p_valor,
        updated_at = NOW()
    WHERE id = v_id_carteira;
    
    -- 7. Registrar em auditoria (se tabela existir)
    INSERT INTO auditoria_financeira (
        operacao,
        tabela_afetada,
        registro_id,
        usuario_id,
        dados_antes,
        dados_depois,
        timestamp
    ) VALUES (
        'PAGAMENTO_INICIADO',
        'movimentacoes_carteira',
        v_id_movimentacao,
        p_admin_id,
        jsonb_build_object('saldo_anterior', v_saldo_calculado),
        jsonb_build_object(
            'valor', p_valor,
            'chave_pix', p_chave_pix,
            'saldo_posterior', v_saldo_calculado - p_valor
        ),
        NOW()
    );
    
    -- 8. Retornar sucesso
    RETURN QUERY SELECT 
        true, 
        'Pagamento registrado com sucesso', 
        v_id_movimentacao, 
        v_saldo_calculado, 
        v_saldo_calculado - p_valor;
END;
$$ LANGUAGE plpgsql;
```

---

### **FASE 4: Confirmação do Pagamento**

Após realizar o Pix manualmente, o admin confirma:

```sql
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
BEGIN
    -- 1. Buscar movimentação
    SELECT id_carteira, valor, status
    INTO v_id_carteira, v_valor, v_status
    FROM movimentacoes_carteira
    WHERE id = p_id_movimentacao;
    
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
    
    -- 4. Registrar auditoria
    INSERT INTO auditoria_financeira (
        operacao,
        tabela_afetada,
        registro_id,
        usuario_id,
        dados_depois,
        timestamp
    ) VALUES (
        'PAGAMENTO_CONFIRMADO',
        'movimentacoes_carteira',
        p_id_movimentacao,
        p_admin_id,
        jsonb_build_object(
            'valor', v_valor,
            'comprovante_url', p_comprovante_url
        ),
        NOW()
    );
    
    RETURN QUERY SELECT true, 'Pagamento confirmado com sucesso';
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Interface do Painel Admin

### Tela: "Pagamentos Pendentes"

#### Seção 1: Pagamentos de Hoje (Urgente)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 PAGAMENTOS DE HOJE (3)                                   │
├─────────────────────────────────────────────────────────────┤
│ João Silva                                    R$ 125,50     │
│ Diário • Chave: 11987654321                                 │
│ [Copiar Pix] [Confirmar Pagamento]                          │
├─────────────────────────────────────────────────────────────┤
│ Maria Santos                                  R$ 89,00      │
│ Diário • Chave: maria@email.com                             │
│ [Copiar Pix] [Confirmar Pagamento]                          │
└─────────────────────────────────────────────────────────────┘
```

#### Seção 2: Próximos Pagamentos
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 PRÓXIMOS PAGAMENTOS (5)                                  │
├─────────────────────────────────────────────────────────────┤
│ Pedro Costa                                   R$ 450,00     │
│ Semanal • Próximo: 25/01/2026                               │
│ Chave: 12345678900                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Seção 3: Alertas
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ ALERTAS (2)                                              │
├─────────────────────────────────────────────────────────────┤
│ Carlos Silva - SEM CHAVE PIX CADASTRADA                     │
│ Ana Costa - VALOR SUSPEITO: R$ 12.500,00                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Checklist Operacional para o Admin

### Antes de Pagar:
- [ ] Verificar se a chave Pix está correta
- [ ] Confirmar o valor com o saldo exibido
- [ ] Verificar se não há alertas de segurança
- [ ] Copiar a chave Pix

### Durante o Pagamento:
- [ ] Realizar transferência no banco/app
- [ ] Tirar print do comprovante
- [ ] Anotar ID da transação

### Após o Pagamento:
- [ ] Clicar em "Confirmar Pagamento" no painel
- [ ] Upload do comprovante (opcional)
- [ ] Verificar se o saldo zerou no app do entregador

---

## 🔍 Relatórios e Auditoria

### Relatório Diário de Pagamentos

```sql
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
```

### Relatório de Inconsistências

```sql
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
```

---

## 🚨 Tratamento de Erros

### Cenários de Erro e Soluções:

| Erro | Causa | Solução |
|------|-------|---------|
| Chave Pix inválida | Entregador não cadastrou | Solicitar cadastro no app |
| Saldo insuficiente | Cálculo incorreto | Recalcular saldo manualmente |
| Pagamento duplicado | Admin clicou 2x | Sistema bloqueia automaticamente |
| Valor suspeito (>R$10k) | Acúmulo de dias | Validar com entregador |
| Pix não caiu | Erro bancário | Reprocessar com comprovante |

---

## 📱 Notificações

### Quando Enviar:

1. **Pagamento Iniciado** (Status: pendente)
   - Notificar entregador: "Seu pagamento de R$ X está sendo processado"

2. **Pagamento Confirmado** (Status: repassado)
   - Notificar entregador: "Pagamento de R$ X confirmado! Verifique sua conta"
   - Push notification com som

3. **Erro no Pagamento**
   - Notificar admin: "Erro ao processar pagamento de [Nome]"
   - Email para equipe técnica

---

## 🔧 Manutenção e Monitoramento

### Rotinas Diárias:
- [ ] Verificar relatório de inconsistências
- [ ] Processar pagamentos pendentes
- [ ] Revisar alertas de segurança

### Rotinas Semanais:
- [ ] Backup da tabela de movimentações
- [ ] Análise de padrões suspeitos
- [ ] Reconciliação bancária

### Rotinas Mensais:
- [ ] Auditoria completa
- [ ] Relatório gerencial
- [ ] Otimização de índices

---

## 📊 Métricas de Sucesso

- **Taxa de Erro**: < 0,1%
- **Tempo Médio de Pagamento**: < 5 minutos
- **Satisfação dos Entregadores**: > 95%
- **Inconsistências Detectadas**: 0
- **Pagamentos Duplicados**: 0

---

**Documento criado em:** 20/01/2026  
**Versão:** 1.0  
**Status:** Pronto para implementação  
**Prioridade:** 🔴 CRÍTICA
