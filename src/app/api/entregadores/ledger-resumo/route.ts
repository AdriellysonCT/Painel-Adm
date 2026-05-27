import { createServerClient } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient()
        const searchParams = request.nextUrl.searchParams
        const entregadorId = searchParams.get('entregador_id')

        if (entregadorId) {
            const [resumo, extratoRes] = await Promise.all([
                supabase.from('view_resumo_ledger_detalhado').select('*').eq('entregador_id', entregadorId).maybeSingle(),
                supabase.from('view_extrato_ledger_detalhado').select('*').eq('entregador_id', entregadorId),
                supabase.from('entregadores_app').select('id, nome').eq('id', entregadorId).single(),
            ])

            const entData = await supabase.from('entregadores_app').select('id, nome').eq('id', entregadorId).single()
            const extrato = extratoRes.data || []

            const cashEntries = extrato.filter((e: any) => e.tipo_pagamento === 'cash')
            const onlineEntries = extrato.filter((e: any) => e.tipo_pagamento === 'online')

            return NextResponse.json({
                entregador: { id: entregadorId, nome: entData.data?.nome || 'Desconhecido' },
                resumo: resumo.data || {
                    qtd_cash: 0, total_cash: 0,
                    qtd_online: 0, total_online: 0,
                    total_taxa_plataforma: 0,
                    qtd_total: 0, total_geral: 0,
                    saldo_online_liquido: 0,
                },
                extrato,
                cash_entries: cashEntries,
                online_entries: onlineEntries,
            })
        }

        const { data, error } = await supabase
            .from('view_resumo_ledger_detalhado')
            .select('*')
            .order('nome_entregador', { ascending: true })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const resultado = (data || []).map(r => ({
            entregador_id: r.entregador_id,
            nome: r.nome_entregador,
            qtd_cash: Number(r.qtd_cash),
            total_cash: Number(r.total_cash),
            qtd_online: Number(r.qtd_online),
            total_online: Number(r.total_online),
            total_taxa_plataforma: Number(r.total_taxa_plataforma),
            qtd_total: Number(r.qtd_total),
            total_geral: Number(r.total_geral),
            saldo_online_liquido: Number(r.saldo_online_liquido),
        }))

        const totais = resultado.reduce((acc, r) => ({
            qtd_cash: acc.qtd_cash + r.qtd_cash,
            total_cash: acc.total_cash + r.total_cash,
            qtd_online: acc.qtd_online + r.qtd_online,
            total_online: acc.total_online + r.total_online,
            total_taxa_plataforma: acc.total_taxa_plataforma + r.total_taxa_plataforma,
            qtd_total: acc.qtd_total + r.qtd_total,
            total_geral: acc.total_geral + r.total_geral,
            saldo_online_liquido: acc.saldo_online_liquido + r.saldo_online_liquido,
        }), {
            qtd_cash: 0, total_cash: 0,
            qtd_online: 0, total_online: 0,
            total_taxa_plataforma: 0,
            qtd_total: 0, total_geral: 0,
            saldo_online_liquido: 0,
        })

        return NextResponse.json({
            entregadores: resultado,
            totais,
            total_entregadores: resultado.length
        })
    } catch (error) {
        console.error('Erro ao buscar ledger-resumo:', error)
        return NextResponse.json({
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 })
    }
}
