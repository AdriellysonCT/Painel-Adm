import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const searchParams = request.nextUrl.searchParams
        const periodo = searchParams.get('periodo') || 'mes'

        // Calcular data de início baseado no período
        let dataInicio = new Date()
        switch (periodo) {
            case 'hoje':
                dataInicio.setHours(0, 0, 0, 0)
                break
            case 'semana':
                dataInicio.setDate(dataInicio.getDate() - 7)
                break
            case 'mes':
                dataInicio.setDate(dataInicio.getDate() - 30)
                break
            case 'total':
                dataInicio = new Date('2020-01-01')
                break
        }

        // Buscar dados da view que já calcula tudo
        const { data: pedidos, error: pedidosError } = await supabase
            .from('view_repasses_com_taxa')
            .select('*')
            .gte('criado_em', dataInicio.toISOString())
            .order('criado_em', { ascending: false })

        if (pedidosError) {
            console.error('Erro ao buscar pedidos:', pedidosError)
            return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 })
        }

        // Processar cada pedido
        const pedidosProcessados = (pedidos || []).map(pedido => {
            const subtotalProdutos = Number(pedido.subtotal_original || 0)
            const taxaPlataforma = Number(pedido.taxa_plataforma || 0)
            const taxaEntrega = Number(pedido.taxa_entrega || 0)
            
            // Ganho restaurante = subtotal - taxa plataforma
            const ganhoRestaurante = subtotalProdutos - taxaPlataforma
            
            // Ganho entregador = 100% da taxa de entrega
            const ganhoEntregador = taxaEntrega
            
            // Total do pedido = subtotal + taxa entrega
            const totalPedido = subtotalProdutos + taxaEntrega

            return {
                numero_pedido: pedido.numero_pedido_sequencial,
                data: pedido.criado_em,
                restaurante: pedido.nome_fantasia || `Restaurante #${pedido.id_restaurante?.substring(0, 8)}`,
                subtotal_produtos: subtotalProdutos,
                taxa_plataforma: taxaPlataforma,
                ganho_restaurante: ganhoRestaurante,
                taxa_entrega: taxaEntrega,
                ganho_entregador: ganhoEntregador,
                total_pedido: totalPedido,
                qtd_itens: Number(pedido.qtd_itens || 0)
            }
        })

        // Calcular resumo geral
        const resumo = {
            total_ganho_plataforma: pedidosProcessados.reduce((acc, p) => acc + p.taxa_plataforma, 0),
            total_ganho_restaurantes: pedidosProcessados.reduce((acc, p) => acc + p.ganho_restaurante, 0),
            total_ganho_entregadores: pedidosProcessados.reduce((acc, p) => acc + p.ganho_entregador, 0),
            total_geral: pedidosProcessados.reduce((acc, p) => acc + p.total_pedido, 0),
            qtd_pedidos: pedidosProcessados.length,
            ticket_medio: pedidosProcessados.length > 0 
                ? pedidosProcessados.reduce((acc, p) => acc + p.total_pedido, 0) / pedidosProcessados.length 
                : 0
        }

        console.log('📊 Breakdown Financeiro:', {
            periodo,
            qtd_pedidos: resumo.qtd_pedidos,
            total_plataforma: resumo.total_ganho_plataforma,
            total_restaurantes: resumo.total_ganho_restaurantes,
            total_entregadores: resumo.total_ganho_entregadores,
            total_geral: resumo.total_geral
        })

        return NextResponse.json({
            pedidos: pedidosProcessados,
            resumo
        })

    } catch (error) {
        console.error('Erro no breakdown financeiro:', error)
        return NextResponse.json(
            { error: 'Erro ao processar breakdown financeiro' },
            { status: 500 }
        )
    }
}
