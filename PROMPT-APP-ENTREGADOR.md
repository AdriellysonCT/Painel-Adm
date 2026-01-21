# 🏍️ Prompt para IA - App do Entregador

## Contexto

Preciso implementar um sistema de **Fechamento de Expediente** no app do entregador que se integra com o painel administrativo. Quando o entregador encerrar seu expediente, o sistema deve calcular automaticamente todos os valores das entregas realizadas e enviar para aprovação do admin.

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

### 1. Botão "Encerrar Expediente"

O botão deve ser associado ao botão de ficar offiline
- quando um usuario usar o voltar ou fazer o gesto no botão nativo do Android/ iphone
o app iria exibir um modal perguntando se deseja minimizar o app ou fechar,
- Caso feche ficara offiline e fechara o expediente.
- Caso seja minimizar o app continuara rodadndo em segundo plano recebendo as entregas normalmente.
- A ideia é usar o botão de ficar offiline tbm para fechar o caixa ou seja quando clicamos atualmente no botão de offiline e fica online ese clicarmos novamente ele pergunta se quer encerrar se clicar sim ele fica offiline e encerra o ideal é aplicar a logica a esse fluxo tbm.

### 2. Lógica de Cálculo

Quando o entregador clicar em "Encerrar Expediente", o sistema deve:

**a) Buscar todas as entregas do período atual:**
```typescript
// Buscar entregas desde o último fechamento ou início do dia
const { data: entregas } = await supabase
    .from('movimentacoes_carteira')
    .select('*')
    .eq('id_carteira', idCarteira)
    .eq('tipo', 'entrada')
    .eq('origem', 'entrega')
    .gte('criado_em', dataUltimoFechamento || inicioDoDia)
    .eq('status', 'confirmado')
```

**b) Calcular os valores:**
```typescript
// Total Bruto: soma de todas as entregas confirmadas
const totalBruto = entregas.reduce((sum, e) => sum + e.valor, 0)

// Descontos: taxa da plataforma (se houver)
// Para entregadores, geralmente não há descontos, mas pode ter:
// - Taxa de uso do app (exemplo: 5%)
// - Descontos de equipamentos/uniformes
const taxaPlataforma = totalBruto * 0.05  // 5% (ajuste conforme seu modelo)
const outrosDescontos = 0 // Se houver outros descontos

const totalDescontos = taxaPlataforma + outrosDescontos

// Total Líquido: o que o entregador vai receber
const totalLiquido = totalBruto - totalDescontos

// Quantidade de entregas
const qtdEntregas = entregas.length
```

**c) Criar o fechamento:**
```typescript
const { data, error } = await supabase
    .from('fechamentos_caixa')
    .insert({
        id_usuario: entregadorId,
        tipo_usuario: 'entregador',
        data_abertura: dataUltimoFechamento || inicioDoDia,
        data_fechamento: new Date().toISOString(),
        total_bruto: totalBruto,
        total_descontos: totalDescontos,
        total_liquido: totalLiquido,
        qtd_transacoes: qtdEntregas,
        status: 'pendente'
    })
    .select()
    .single()
```

### 3. Tela de Resumo do Expediente

Antes de criar o fechamento, mostrar uma tela com:

```
┌─────────────────────────────────────┐
│   🏍️ Resumo do Expediente           │
├─────────────────────────────────────┤
│                                     │
│  Período de Trabalho:               │
│  08/01/2025 08:00 - 22:00           │
│  (14 horas)                         │
│                                     │
│  📦 Entregas Realizadas: 32         │
│                                     │
│  💰 Seus Ganhos:                    │
│                                     │
│  Total de Entregas:    R$ 384,00    │
│  Taxa do App (5%):     -R$ 19,20    │
│  ─────────────────────────────────  │
│  Você vai receber:     R$ 364,80    │
│                                     │
│  📊 Estatísticas:                   │
│  • Média por entrega: R$ 12,00      │
│  • Ganho por hora: R$ 26,06         │
│  • Distância total: 85 km           │
│                                     │
│  [Voltar]  [Encerrar Expediente]    │
└─────────────────────────────────────┘
```

### 4. Feedback Visual

Após criar o fechamento:
- ✅ Animação de sucesso (confete, check animado)
- 📄 Mostrar card com resumo do dia
- 🔔 Notificação: "Expediente encerrado! Aguardando aprovação"
- 💬 Mensagem motivacional: "Ótimo trabalho hoje! 🎉"
- 📧 (Opcional) Enviar resumo por email/WhatsApp

### 5. Histórico de Expedientes

atualizar a seção "historico" para onde o entregador pode ver:

**Lista de fechamentos:**
```
┌────────────────────────────────────┐
│ 📅 Janeiro 2025                    │
├────────────────────────────────────┤
│                                    │
│ ✅ 08/01 - Aprovado                │
│ 32 entregas • R$ 364,80            │
│ ─────────────────────────────────  │
│                                    │
│ 🕐 07/01 - Aguardando              │
│ 28 entregas • R$ 312,00            │
│ ─────────────────────────────────  │
│                                    │
│ ✅ 06/01 - Pago                    │
│ 35 entregas • R$ 420,00            │
│                                    │
└────────────────────────────────────┘
```

**Detalhes de cada fechamento:**
```
┌────────────────────────────────────┐
│ Expediente - 08/01/2025            │
├────────────────────────────────────┤
│                                    │
│ Status: ✅ Aprovado                │
│                                    │
│ Horário: 08:00 - 22:00 (14h)       │
│                                    │
│ 💰 Valores:                        │
│ Total Bruto:    R$ 384,00          │
│ Taxa App:       -R$ 19,20          │
│ Líquido:        R$ 364,80          │
│                                    │
│ 📦 Entregas: 32                    │
│ 📍 Distância: 85 km                │
│ ⭐ Avaliação média: 4.8            │
│                                    │
│ [Ver Entregas Detalhadas]          │
└────────────────────────────────────┘
```

### 6. Dashboard de Ganhos (Opcional mas Recomendado)

Criar uma aba em historico para mostrar:

```
┌─────────────────────────────────────┐
│   💰 Meus Ganhos                    │
├─────────────────────────────────────┤
│                                     │
│  Hoje (em andamento)                │
│  ┌─────────────────────────────┐   │
│  │ R$ 156,00                   │   │
│  │ 13 entregas                 │   │
│  │ [Encerrar Expediente]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  Esta Semana                        │
│  R$ 1.820,00 • 152 entregas         │
│                                     │
│  Este Mês                           │
│  R$ 3.640,00 • 304 entregas         │
│                                     │
│  Aguardando Aprovação               │
│  R$ 728,00 (2 expedientes)          │
│                                     │
│  [Ver Histórico Completo]           │
└─────────────────────────────────────┘
```

### 7. Notificações em Tempo Real

Usar Supabase Realtime para notificar quando o fechamento for aprovado:

```typescript
const channel = supabase
    .channel('fechamentos-entregador')
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'fechamentos_caixa',
        filter: `id_usuario=eq.${entregadorId}`
    }, (payload) => {
        if (payload.new.status === 'aprovado') {
            // Mostrar notificação push
            mostrarNotificacao(
                '💰 Pagamento Aprovado!',
                `Seu expediente de ${formatarData(payload.new.data_fechamento)} foi aprovado. Você receberá R$ ${payload.new.total_liquido.toFixed(2)}`
            )
            
            // Tocar som de sucesso
            tocarSomSucesso()
            
            // Atualizar lista de fechamentos
            recarregarFechamentos()
        }
    })
    .subscribe()
```

### 8. Validações Importantes

Antes de permitir encerrar expediente:

```typescript
async function validarFechamento() {
    // 1. Verificar se há entregas no período
    if (entregas.length === 0) {
        alert('Você não realizou entregas hoje')
        return false
    }

    // 2. Verificar se já existe fechamento pendente
    const { data: pendente } = await supabase
        .from('fechamentos_caixa')
        .select('id')
        .eq('id_usuario', entregadorId)
        .eq('status', 'pendente')
        .single()

    if (pendente) {
        alert('Você já tem um fechamento aguardando aprovação')
        return false
    }

    // 3. Verificar se há entregas em andamento
    const { data: emAndamento } = await supabase
        .from('entregas')
        .select('id')
        .eq('id_entregador', entregadorId)
        .in('status', ['em_andamento', 'coletado'])

    if (emAndamento && emAndamento.length > 0) {
        alert('Você ainda tem entregas em andamento. Finalize-as antes de encerrar o expediente.')
        return false
    }

    return true
}
```

## Regras de Negócio

1. **Não permitir encerrar expediente se:**
   
   
   - Há entregas em andamento (não finalizadas)

2. **Período do expediente:**
   - Desde o último fechamento até agora
   - Ou desde o início do dia (00:00) se for o primeiro fechamento


## Exemplo de Implementação Completa

```typescript
// Componente EncerrarExpedienteButton.tsx
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function EncerrarExpedienteButton({ entregadorId, idCarteira }) {
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [resumo, setResumo] = useState(null)
    const [entregasHoje, setEntregasHoje] = useState(0)
    const [ganhoHoje, setGanhoHoje] = useState(0)

    // Atualizar contador em tempo real
    useEffect(() => {
        carregarEntregasHoje()
        
        // Atualizar a cada nova entrega
        const channel = supabase
            .channel('entregas-hoje')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'movimentacoes_carteira',
                filter: `id_carteira=eq.${idCarteira}`
            }, () => {
                carregarEntregasHoje()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function carregarEntregasHoje() {
        const inicioDoDia = new Date().setHours(0,0,0,0)
        
        const { data } = await supabase
            .from('movimentacoes_carteira')
            .select('valor')
            .eq('id_carteira', idCarteira)
            .eq('tipo', 'entrada')
            .eq('origem', 'entrega')
            .gte('criado_em', new Date(inicioDoDia).toISOString())
            .eq('status', 'confirmado')

        if (data) {
            setEntregasHoje(data.length)
            setGanhoHoje(data.reduce((sum, e) => sum + e.valor, 0))
        }
    }

    async function calcularFechamento() {
        setLoading(true)
        try {
            // 1. Buscar último fechamento
            const { data: ultimoFechamento } = await supabase
                .from('fechamentos_caixa')
                .select('data_fechamento')
                .eq('id_usuario', entregadorId)
                .order('data_fechamento', { ascending: false })
                .limit(1)
                .single()

            const dataInicio = ultimoFechamento?.data_fechamento || new Date().setHours(0,0,0,0)

            // 2. Buscar entregas
            const { data: entregas } = await supabase
                .from('movimentacoes_carteira')
                .select('*')
                .eq('id_carteira', idCarteira)
                .eq('tipo', 'entrada')
                .eq('origem', 'entrega')
                .eq('status', 'confirmado')
                .gte('criado_em', new Date(dataInicio).toISOString())

            if (!entregas || entregas.length === 0) {
                alert('Você não realizou entregas neste período')
                return
            }

            // 3. Verificar se há fechamento pendente
            const { data: pendente } = await supabase
                .from('fechamentos_caixa')
                .select('id')
                .eq('id_usuario', entregadorId)
                .eq('status', 'pendente')
                .single()

            if (pendente) {
                alert('Você já tem um fechamento aguardando aprovação')
                return
            }

            // 4. Calcular valores
            const totalBruto = entregas.reduce((sum, e) => sum + e.valor, 0)
            const taxaApp = totalBruto * 0.05 // 5% (ajuste conforme necessário)
            const totalDescontos = taxaApp
            const totalLiquido = totalBruto - totalDescontos

            // Calcular estatísticas
            const horasTrabalhadas = (new Date() - new Date(dataInicio)) / (1000 * 60 * 60)
            const mediaPorEntrega = totalBruto / entregas.length
            const ganhoPorHora = totalLiquido / horasTrabalhadas

            // 5. Mostrar resumo no modal
            setResumo({
                dataInicio,
                dataFim: new Date(),
                horasTrabalhadas: horasTrabalhadas.toFixed(1),
                totalBruto,
                taxaApp,
                totalDescontos,
                totalLiquido,
                qtdEntregas: entregas.length,
                mediaPorEntrega,
                ganhoPorHora
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
                    id_usuario: entregadorId,
                    tipo_usuario: 'entregador',
                    data_abertura: resumo.dataInicio,
                    data_fechamento: resumo.dataFim.toISOString(),
                    total_bruto: resumo.totalBruto,
                    total_descontos: resumo.totalDescontos,
                    total_liquido: resumo.totalLiquido,
                    qtd_transacoes: resumo.qtdEntregas,
                    status: 'pendente'
                })

            if (error) throw error

            // Mostrar mensagem de sucesso
            alert('🎉 Expediente encerrado com sucesso! Aguardando aprovação do pagamento.')
            setModalOpen(false)
            
            // Resetar contadores
            setEntregasHoje(0)
            setGanhoHoje(0)
            
            // Redirecionar para histórico
            // navigation.navigate('Historico')
            
        } catch (error) {
            console.error('Erro ao criar fechamento:', error)
            alert('Erro ao encerrar expediente')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Card de ganhos do dia */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
                <p className="text-sm opacity-90">Ganhos de Hoje</p>
                <p className="text-3xl font-bold">R$ {ganhoHoje.toFixed(2)}</p>
                <p className="text-sm opacity-90">{entregasHoje} entregas realizadas</p>
            </div>

            {/* Botão de encerrar */}
            <button 
                onClick={calcularFechamento} 
                disabled={loading || entregasHoje === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
            >
                {loading ? 'Calculando...' : '🏁 Encerrar Expediente'}
            </button>

            {/* Modal de confirmação */}
            {modalOpen && (
                <Modal onClose={() => setModalOpen(false)}>
                    <h2 className="text-xl font-bold mb-4">🏍️ Resumo do Expediente</h2>
                    
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">Período de Trabalho</p>
                            <p className="font-semibold">
                                {new Date(resumo.dataInicio).toLocaleString()} - {resumo.dataFim.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">({resumo.horasTrabalhadas} horas)</p>
                        </div>

                        <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total de Entregas</p>
                            <p className="text-2xl font-bold text-emerald-600">R$ {resumo.totalBruto.toFixed(2)}</p>
                            
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Taxa do App (5%)</span>
                                    <span className="text-red-600">-R$ {resumo.taxaApp.toFixed(2)}</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Você vai receber</span>
                                    <span className="text-emerald-600">R$ {resumo.totalLiquido.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-semibold mb-2">📊 Estatísticas</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Entregas realizadas</span>
                                    <span className="font-semibold">{resumo.qtdEntregas}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Média por entrega</span>
                                    <span className="font-semibold">R$ {resumo.mediaPorEntrega.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Ganho por hora</span>
                                    <span className="font-semibold">R$ {resumo.ganhoPorHora.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button 
                            onClick={() => setModalOpen(false)}
                            className="flex-1 bg-gray-200 py-2 rounded-lg"
                        >
                            Voltar
                        </button>
                        <button 
                            onClick={confirmarFechamento}
                            disabled={loading}
                            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-semibold"
                        >
                            {loading ? 'Encerrando...' : 'Confirmar'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
```

## Checklist de Implementação

- [ ] Criar botão "Encerrar Expediente" visível
- [ ] Implementar contador de entregas/ganhos em tempo real
- [ ] Implementar lógica de cálculo de valores
- [ ] Criar tela de resumo do expediente
- [ ] Inserir fechamento na tabela `fechamentos_caixa`
- [ ] Criar página de histórico de expedientes
- [ ] Adicionar validações (não permitir encerrar sem entregas, etc)
- [ ] Implementar notificações quando aprovado
- [ ] Adicionar estatísticas (média por entrega, ganho por hora)
- [ ] Testar com dados reais
- [ ] Ajustar percentuais de taxa conforme modelo de negócio

## Resultado Esperado

Quando implementado, o entregador poderá:
1. Ver em tempo real quantas entregas fez e quanto ganhou
2. Clicar em "online para ficar offiline " e "Encerrar Expediente"
3. Ver um resumo detalhado com estatísticas
4. Confirmar o fechamento
5. Acompanhar o status (pendente → aprovado → pago)
6. Receber notificação quando o admin aprovar
7. Ver histórico completo de todos os expedientes

O admin verá o fechamento no painel administrativo e poderá aprovar com um clique.

## Dicas de UX

- Use cores vibrantes para os ganhos (verde, azul)
- Adicione animações de sucesso ao encerrar
- Mostre mensagens motivacionais ("Ótimo trabalho!", "Você arrasou hoje!")
- Permita compartilhar o resumo do dia nas redes sociais
- Adicione gráficos de evolução semanal/mensal
- Mostre ranking de melhores dias
