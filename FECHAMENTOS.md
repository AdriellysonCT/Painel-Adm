# 📊 Sistema de Fechamentos de Caixa

## Como Funciona

O sistema de fechamentos automatiza o processo de cálculo e aprovação de repasses para restaurantes e entregadores.

### Fluxo Completo

```
1. Restaurante/Entregador fecha o caixa no app
   ↓
2. Sistema calcula automaticamente:
   - Total bruto (vendas/entregas)
   - Descontos (taxas da plataforma)
   - Total líquido (valor a receber)
   ↓
3. Fechamento aparece como "Pendente" no painel admin
   ↓
4. Admin revisa e aprova o fechamento
   ↓
5. Sistema cria movimentação de repasse
   ↓
6. Valor fica disponível para pagamento
```

### Estrutura do Banco de Dados

```sql
CREATE TABLE fechamentos_caixa (
    id UUID PRIMARY KEY,
    id_usuario UUID,                    -- ID do restaurante ou entregador
    tipo_usuario TEXT,                  -- 'restaurante' ou 'entregador'
    data_abertura TIMESTAMPTZ,          -- Quando abriu o caixa
    data_fechamento TIMESTAMPTZ,        -- Quando fechou o caixa
    total_bruto DECIMAL(10,2),          -- Total antes dos descontos
    total_descontos DECIMAL(10,2),      -- Taxas e descontos
    total_liquido DECIMAL(10,2),        -- Valor final a receber
    qtd_transacoes INT,                 -- Quantidade de pedidos/entregas
    status TEXT,                        -- 'pendente', 'aprovado', 'pago'
    observacoes TEXT,                   -- Notas adicionais
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

## Interface do Painel Admin

### Aba "Fechamentos"

A nova aba mostra:

**KPIs no topo:**
- 🕐 **Pendentes**: Quantidade e valor total aguardando aprovação
- ✅ **Aprovados Hoje**: Fechamentos processados hoje
- 💰 **Total Processado**: Soma de todos os fechamentos aprovados

**Cards de Fechamento:**
Cada card mostra de forma visual:
- Nome do usuário (restaurante/entregador)
- Status (pendente/aprovado)
- 📈 Total Bruto
- 📉 Descontos (em vermelho)
- ✨ **Total Líquido** (destaque em verde)
- 📅 Data do fechamento
- Quantidade de transações

**Filtros:**
- Pendentes
- Aprovados
- Todos

### Aprovar Fechamento

1. Clique no card do fechamento
2. Revise os detalhes no modal
3. Clique em "Aprovar Fechamento"
4. Sistema automaticamente:
   - Atualiza status para "aprovado"
   - Cria movimentação de repasse
   - Atualiza saldo do usuário

## APIs Criadas

### GET `/api/fechamentos/listar`
Lista fechamentos com filtros

**Query params:**
- `status`: 'pendente' | 'aprovado' | 'todos'
- `tipo_usuario`: 'restaurante' | 'entregador' (opcional)

**Response:**
```json
[
  {
    "id": "uuid",
    "nome_usuario": "Pizzaria Bella Napoli",
    "tipo_usuario": "restaurante",
    "total_bruto": 500.00,
    "total_descontos": 50.00,
    "total_liquido": 450.00,
    "qtd_transacoes": 15,
    "status": "pendente",
    "data_fechamento": "2025-01-09T23:00:00Z"
  }
]
```

### POST `/api/fechamentos/aprovar`
Aprova um fechamento

**Body:**
```json
{
  "id_fechamento": "uuid",
  "observacoes": "Aprovado conforme análise" // opcional
}
```

## Como Criar Fechamentos (App do Restaurante/Entregador)

No app do restaurante/entregador, você precisará criar um endpoint que:

```typescript
// Exemplo de criação de fechamento
async function criarFechamento(userId: string, tipoUsuario: 'restaurante' | 'entregador') {
    // 1. Buscar todas as movimentações do período
    const movimentacoes = await buscarMovimentacoesPeriodo(userId, dataInicio, dataFim)
    
    // 2. Calcular totais
    const totalBruto = movimentacoes
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + m.valor, 0)
    
    const totalDescontos = calcularDescontos(totalBruto, tipoUsuario)
    const totalLiquido = totalBruto - totalDescontos
    
    // 3. Criar fechamento
    await supabase.from('fechamentos_caixa').insert({
        id_usuario: userId,
        tipo_usuario: tipoUsuario,
        data_abertura: dataInicio,
        data_fechamento: new Date(),
        total_bruto: totalBruto,
        total_descontos: totalDescontos,
        total_liquido: totalLiquido,
        qtd_transacoes: movimentacoes.length,
        status: 'pendente'
    })
}
```

## Vantagens do Sistema

✅ **Automação**: Cálculos feitos automaticamente
✅ **Transparência**: Usuários veem exatamente quanto vão receber
✅ **Auditoria**: Histórico completo de todos os fechamentos
✅ **Eficiência**: Admin aprova em segundos, não precisa calcular
✅ **Visual**: Interface clara e fácil de entender
✅ **Segurança**: Validações em todas as etapas

## Próximos Passos

- [ ] Adicionar notificações quando fechamento é aprovado
- [ ] Permitir rejeitar fechamentos com motivo
- [ ] Gerar PDF do fechamento
- [ ] Fechamento automático em horários programados
- [ ] Dashboard de métricas de fechamentos
