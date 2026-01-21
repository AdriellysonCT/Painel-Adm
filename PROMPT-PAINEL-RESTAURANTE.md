# 🍕 Prompt para IA - Painel do Restaurante

## Contexto

Preciso implementar um sistema de **Fechamento de Caixa** no painel do restaurante que se integra com o painel administrativo. Quando o restaurante fechar o caixa, o sistema deve calcular automaticamente todos os valores e enviar para aprovação do admin.

## Estrutura do Banco de Dados

A tabela `fechamentos_caixa` já existe no Supabase com esta estrutura:

```sql
CREATE TABLE fechamentos_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL,
    tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('restaurante', 'entregador')),
    data_abertura TIMESTAMPTZ NOT NULL,
    data_fechamento TIMESTAMPTZ NOT NULL,
    total_bruto DECIMAL(10,2) NOT NULL,
    total_descontos DECIMAL(10,2) NOT NULL,
    total_liquido DECIMAL(10,2) NOT NULL,
    qtd_transacoes INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'pago')),
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

## Requisitos da Implementação

### 1. Botão "Fechar Caixa"

Criar um botão visível no painel do restaurante (pode ser no header ou em uma seção específica) com:
- Ícone de caixa registradora ou calculadora
- Texto "Fechar Caixa" ou "Encerrar Expediente"
- Deve estar sempre visível quando há vendas não fechadas

### 2. Lógica de Cálculo

Quando o restaurante clicar em "Fechar Caixa", o sistema deve:

**a) Buscar todas as movimentações do período atual:**
```typescript
// Buscar movimentações desde o último fechamento ou início do dia
const { data: movimentacoes } = await supabase
    .from('movimentacoes_carteira')
    .select('*')
    .eq('id_carteira', idCarteira)
    .eq('tipo', 'entrada')
    .eq('origem', 'pedido')
    .gte('criado_em', dataUltimoFechamento || inicioDoDia)
    .eq('status', 'confirmado')
```

**b) Calcular os valores:**
```typescript
// Total Bruto: soma de todas as vendas confirmadas
const totalBruto = movimentacoes.reduce((sum, m) => sum + m.valor, 0)

// Descontos: taxa da plataforma (exemplo: 10%) + taxa de entrega
const taxaPlataforma = totalBruto * 0.10  // 10% da plataforma
const taxaEntrega = calcularTaxasEntrega(movimentacoes) // Somar taxas de entrega
const totalDescontos = taxaPlataforma + taxaEntrega

// Total Líquido: o que o restaurante vai receber
const totalLiquido = totalBruto - totalDescontos

// Quantidade de transações
const qtdTransacoes = movimentacoes.length
```

**c) Criar o fechamento:**
```typescript
const { data, error } = await supabase
    .from('fechamentos_caixa')
    .insert({
        id_usuario: restauranteId,
        tipo_usuario: 'restaurante',
        data_abertura: dataUltimoFechamento || inicioDoDia,
        data_fechamento: new Date().toISOString(),
        total_bruto: totalBruto,
        total_descontos: totalDescontos,
        total_liquido: totalLiquido,
        qtd_transacoes: qtdTransacoes,
        status: 'pendente'
    })
    .select()
    .single()
```

### 3. Modal de Confirmação

Antes de criar o fechamento, mostrar um modal com:

```
┌─────────────────────────────────────┐
│   Confirmar Fechamento de Caixa     │
├─────────────────────────────────────┤
│                                     │
│  Período:                           │
│  08/01/2025 08:00 - 08/01/2025 22:00│
│                                     │
│  📊 Resumo do Fechamento:           │
│                                     │
│  Total de Vendas:      R$ 1.500,00  │
│  Taxa Plataforma (10%): -R$ 150,00  │
│  Taxa Entrega:          -R$ 120,00  │
│  ─────────────────────────────────  │
│  Você vai receber:     R$ 1.230,00  │
│                                     │
│  Transações: 25 pedidos             │
│                                     │
│  [Cancelar]  [Confirmar Fechamento] │
└─────────────────────────────────────┘
```

### 4. Feedback Visual

Após criar o fechamento:
- ✅ Mostrar mensagem de sucesso
- 📄 Exibir resumo do fechamento
- 🔔 Informar que está aguardando aprovação do admin
- 📧 (Opcional) Enviar email/notificação com o resumo

### 5. Histórico de Fechamentos

Criar uma seção "Meus Fechamentos" onde o restaurante pode ver:
- Lista de todos os fechamentos
- Status de cada um (pendente/aprovado/pago)
- Valores detalhados
- Data de criação e aprovação

**Exemplo de card:**
```
┌────────────────────────────────────┐
│ Fechamento #1234                   │
│ 08/01/2025 - 22:00                 │
│                                    │
│ Status: 🕐 Aguardando Aprovação    │
│                                    │
│ Total Bruto:    R$ 1.500,00        │
│ Descontos:      -R$ 270,00         │
│ Líquido:        R$ 1.230,00        │
│                                    │
│ 25 transações                      │
└────────────────────────────────────┘
```

### 6. Notificações em Tempo Real (Opcional)

Usar Supabase Realtime para notificar quando o fechamento for aprovado:

```typescript
const channel = supabase
    .channel('fechamentos')
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'fechamentos_caixa',
        filter: `id_usuario=eq.${restauranteId}`
    }, (payload) => {
        if (payload.new.status === 'aprovado') {
            // Mostrar notificação: "Seu fechamento foi aprovado!"
            mostrarNotificacao('Fechamento aprovado!', payload.new)
        }
    })
    .subscribe()
```

## Regras de Negócio

1. **Não permitir fechar caixa se:**
   - Há pedidos em andamento (não confirmados)

2. **Período do fechamento:**
   - Pode ser diário (padrão)
   - Ou desde o último fechamento até agora


## Exemplo de Implementação Completa

```typescript
// Componente FecharCaixaButton.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function FecharCaixaButton({ restauranteId, idCarteira }) {
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [resumo, setResumo] = useState(null)

    async function calcularFechamento() {
        setLoading(true)
        try {
            // 1. Buscar último fechamento
            const { data: ultimoFechamento } = await supabase
                .from('fechamentos_caixa')
                .select('data_fechamento')
                .eq('id_usuario', restauranteId)
                .order('data_fechamento', { ascending: false })
                .limit(1)
                .single()

            const dataInicio = ultimoFechamento?.data_fechamento || new Date().setHours(0,0,0,0)

            // 2. Buscar movimentações
            const { data: movimentacoes } = await supabase
                .from('movimentacoes_carteira')
                .select('*')
                .eq('id_carteira', idCarteira)
                .eq('tipo', 'entrada')
                .eq('status', 'confirmado')
                .gte('criado_em', new Date(dataInicio).toISOString())

            if (!movimentacoes || movimentacoes.length === 0) {
                alert('Não há vendas para fechar')
                return
            }

            // 3. Calcular valores
            const totalBruto = movimentacoes.reduce((sum, m) => sum + m.valor, 0)
            const taxaPlataforma = totalBruto * 0.10
            
            // Buscar taxas de entrega (se estiverem em outra tabela)
            const taxaEntrega = 0 // Calcular conforme sua lógica
            
            const totalDescontos = taxaPlataforma + taxaEntrega
            const totalLiquido = totalBruto - totalDescontos

            // 4. Mostrar resumo no modal
            setResumo({
                dataInicio,
                dataFim: new Date(),
                totalBruto,
                taxaPlataforma,
                taxaEntrega,
                totalDescontos,
                totalLiquido,
                qtdTransacoes: movimentacoes.length
            })
            setModalOpen(true)

        } catch (error) {
            console.error('Erro ao calcular fechamento:', error)
            alert('Erro ao calcular fechamento')
        } finally {
            setLoading(false)
        }
    }

    async function confirmarFechamento() {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('fechamentos_caixa')
                .insert({
                    id_usuario: restauranteId,
                    tipo_usuario: 'restaurante',
                    data_abertura: resumo.dataInicio,
                    data_fechamento: resumo.dataFim.toISOString(),
                    total_bruto: resumo.totalBruto,
                    total_descontos: resumo.totalDescontos,
                    total_liquido: resumo.totalLiquido,
                    qtd_transacoes: resumo.qtdTransacoes,
                    status: 'pendente'
                })

            if (error) throw error

            alert('Fechamento criado com sucesso! Aguardando aprovação do admin.')
            setModalOpen(false)
            // Redirecionar para página de fechamentos ou atualizar lista
            
        } catch (error) {
            console.error('Erro ao criar fechamento:', error)
            alert('Erro ao criar fechamento')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button onClick={calcularFechamento} disabled={loading}>
                {loading ? 'Calculando...' : 'Fechar Caixa'}
            </button>

            {modalOpen && (
                <Modal onClose={() => setModalOpen(false)}>
                    <h2>Confirmar Fechamento de Caixa</h2>
                    <div>
                        <p>Período: {new Date(resumo.dataInicio).toLocaleString()} - {resumo.dataFim.toLocaleString()}</p>
                        <p>Total Bruto: R$ {resumo.totalBruto.toFixed(2)}</p>
                        <p>Taxa Plataforma: -R$ {resumo.taxaPlataforma.toFixed(2)}</p>
                        <p>Taxa Entrega: -R$ {resumo.taxaEntrega.toFixed(2)}</p>
                        <hr />
                        <p><strong>Você vai receber: R$ {resumo.totalLiquido.toFixed(2)}</strong></p>
                        <p>{resumo.qtdTransacoes} transações</p>
                    </div>
                    <button onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button onClick={confirmarFechamento} disabled={loading}>
                        {loading ? 'Confirmando...' : 'Confirmar Fechamento'}
                    </button>
                </Modal>
            )}
        </>
    )
}
```

## Checklist de Implementação

- [ ] Criar botão "Fechar Caixa" no painel
- [ ] Implementar lógica de cálculo de valores
- [ ] Criar modal de confirmação com resumo
- [ ] Inserir fechamento na tabela `fechamentos_caixa`
- [ ] Criar página de histórico de fechamentos
- [ ] Adicionar validações (não permitir fechar sem vendas, etc)
- [ ] Implementar notificações quando aprovado (opcional)
- [ ] Testar com dados reais
- [ ] Ajustar percentuais de taxa conforme modelo de negócio

## Resultado Esperado

Quando implementado, o restaurante poderá:
1. Clicar em "Fechar Caixa" a qualquer momento
2. Ver um resumo claro de quanto vai receber
3. Confirmar o fechamento
4. Acompanhar o status (pendente → aprovado → pago)
5. Receber notificação quando o admin aprovar

O admin verá o fechamento no painel administrativo e poderá aprovar com um clique.
