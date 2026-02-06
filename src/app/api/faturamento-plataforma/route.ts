import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const searchParams = request.nextUrl.searchParams
        const periodo = searchParams.get('periodo') || 'mes'

        // Calcular data de início baseado no período
        let dataInicio: string
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        
        // Para o resumo de meses ser preciso, precisamos de dados do mês anterior completo
        // se o período for 'mes' ou superior.
        const inicioConfigurado = new Date()
        
        switch (periodo) {
            case 'hoje':
                inicioConfigurado.setHours(0, 0, 0, 0)
                dataInicio = inicioConfigurado.toISOString()
                break
            case 'semana':
                inicioConfigurado.setDate(hoje.getDate() - 7)
                dataInicio = inicioConfigurado.toISOString()
                break
            case 'mes':
                // Buscamos 60 dias para ter o mês atual e o anterior completos para comparação
                inicioConfigurado.setDate(hoje.getDate() - 60)
                dataInicio = inicioConfigurado.toISOString()
                break
            case 'total':
            default:
                dataInicio = '2020-01-01T00:00:00.000Z'
                break
        }

        console.log('🔍 Buscando faturamento desde:', dataInicio, 'Período:', periodo)

        // Buscar direto dos itens_pedido com JOIN
        const { data: itensPedido, error: itensError } = await supabase
            .from('itens_pedido')
            .select(`
                id_pedido,
                preco_original,
                taxa_plataforma,
                quantidade,
                pedidos_padronizados!inner(
                    numero_pedido_sequencial,
                    criado_em,
                    subtotal,
                    valor_total,
                    status,
                    id_restaurante,
                    restaurantes_app(nome_fantasia)
                )
            `)
            .gte('pedidos_padronizados.criado_em', dataInicio)
            .in('pedidos_padronizados.status', ['concluido', 'entregue'])

        if (itensError) {
            console.error('❌ Erro no faturamento-plataforma:', itensError)
            return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
        }

        // Agrupar por pedido
        const pedidosMap = new Map()
        for (const item of itensPedido || []) {
            const pedidoData = (item as any).pedidos_padronizados
            const pedidoId = item.id_pedido
            
            if (!pedidosMap.has(pedidoId)) {
                pedidosMap.set(pedidoId, {
                    numero_pedido: pedidoData.numero_pedido_sequencial,
                    data: pedidoData.criado_em,
                    restaurante: pedidoData.restaurantes_app?.nome_fantasia || 'Sem nome',
                    qtd_itens: 0,
                    taxa_total: 0,
                    valor_produtos: Number(pedidoData.subtotal || pedidoData.valor_total || 0)
                })
            }
            
            const pedido = pedidosMap.get(pedidoId)
            pedido.qtd_itens += Number(item.quantidade || 1)
            pedido.taxa_total += Number(item.taxa_plataforma || 0) * Number(item.quantidade || 1)
        }

        let vendasFull = Array.from(pedidosMap.values()).sort((a, b) => 
            new Date(b.data).getTime() - new Date(a.data).getTime()
        )

        // Filtramos as vendas para exibição de acordo com o período real solicitado
        const dataCorteExibicao = new Date()
        if (periodo === 'mes') dataCorteExibicao.setDate(hoje.getDate() - 30)
        else if (periodo === 'semana') dataCorteExibicao.setDate(hoje.getDate() - 7)
        else if (periodo === 'hoje') dataCorteExibicao.setHours(0, 0, 0, 0)
        else dataCorteExibicao.setFullYear(2020)

        const vendas = vendasFull.filter(v => new Date(v.data) >= dataCorteExibicao)

        // Calcular resumo (usando vendasFull para ter o mês anterior completo se necessário)
        const mesAtual = hoje.getMonth()
        const anoAtual = hoje.getFullYear()
        const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1
        const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual

        const faturamentoTotal = vendas.reduce((acc, v) => acc + v.taxa_total, 0)
        const faturamentoHoje = vendasFull
            .filter(v => new Date(v.data) >= hoje)
            .reduce((acc, v) => acc + v.taxa_total, 0)
        
        const faturamentoMes = vendasFull
            .filter(v => {
                const data = new Date(v.data)
                return data.getMonth() === mesAtual && data.getFullYear() === anoAtual
            })
            .reduce((acc, v) => acc + v.taxa_total, 0)
        
        const faturamentoMesAnterior = vendasFull
            .filter(v => {
                const data = new Date(v.data)
                return data.getMonth() === mesAnterior && data.getFullYear() === anoMesAnterior
            })
            .reduce((acc, v) => acc + v.taxa_total, 0)

        const qtdPedidos = vendas.length
        const qtdItens = vendas.reduce((acc, v) => acc + v.qtd_itens, 0)
        const taxaMedia = qtdPedidos > 0 ? faturamentoTotal / qtdPedidos : 0

        const crescimentoPercentual = faturamentoMesAnterior > 0
            ? ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior) * 100
            : 0

        const resumo = {
            faturamento_total: faturamentoTotal, // Total do período selecionado
            faturamento_hoje: faturamentoHoje,
            faturamento_mes: faturamentoMes,
            faturamento_mes_anterior: faturamentoMesAnterior,
            qtd_pedidos: qtdPedidos,
            qtd_itens: qtdItens,
            taxa_media: taxaMedia,
            crescimento_percentual: crescimentoPercentual
        }

        console.log('✅ Breakdown Processado:', {
            periodo,
            vendas: vendas.length,
            total: faturamentoTotal,
            crescimento: crescimentoPercentual.toFixed(2) + '%'
        })

        return NextResponse.json({ vendas, resumo })

    } catch (error) {
        console.error('❌ Erro no Breakdown:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
