import { createServerClient } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient()
        const searchParams = request.nextUrl.searchParams
        const entregadorId = searchParams.get('entregador_id')

        if (entregadorId) {
            const [resumoView, lancamentos, entData] = await Promise.all([
                supabase.from('view_resumo_cash_digital_entregadores').select('*').eq('entregador_id', entregadorId).maybeSingle(),
                supabase.from('ledger_lancamentos').select('*').eq('conta_recebedora_id', entregadorId).eq('status', 'CONFIRMADO').order('criado_em', { ascending: false }),
                supabase.from('entregadores_app').select('id, nome').eq('id', entregadorId).single(),
            ])

            if (lancamentos.error) {
                return NextResponse.json({ error: lancamentos.error.message }, { status: 500 })
            }

            const cashColetado = Number(resumoView.data?.total_cash_coletado || 0)
            const taxaCash = Number(resumoView.data?.total_taxa_cash || 0)
            const totalDigital = Number(resumoView.data?.total_digital || 0)
            const qtdCash = Number(resumoView.data?.qtd_cash || 0)
            const qtdDigital = Number(resumoView.data?.qtd_digital || 0)
            const totalEntregas = Number(resumoView.data?.qtd_total_entregas || 0)

            const resumo = {
                total_cash_credito: cashColetado,
                total_cash_debito: taxaCash,
                total_digital: totalDigital,
                total_geral: cashColetado + totalDigital,
                qtd_cash_credito: qtdCash,
                qtd_cash_total: qtdCash,
                qtd_digital: qtdDigital,
                qtd_entregas: totalEntregas,
            }

            return NextResponse.json({
                entregador: {
                    id: entregadorId,
                    nome: entData.data?.nome || 'Desconhecido'
                },
                resumo,
                saldo_cash_liquido: cashColetado - taxaCash,
                extrato: lancamentos.data || []
            })
        }

        const [resumoView, lancamentos] = await Promise.all([
            supabase.from('view_resumo_cash_digital_entregadores').select('*').order('nome'),
            supabase.from('ledger_lancamentos').select('*').eq('status', 'CONFIRMADO').order('criado_em', { ascending: false }),
        ])

        if (resumoView.error) {
            return NextResponse.json({ error: resumoView.error.message }, { status: 500 })
        }
        if (lancamentos.error) {
            return NextResponse.json({ error: lancamentos.error.message }, { status: 500 })
        }

        const ledgerPorEntregador = new Map<string, Record<string, unknown>[]>()
        for (const l of (lancamentos.data || [])) {
            const id = l.conta_recebedora_id as string | undefined
            if (!id) continue
            if (!ledgerPorEntregador.has(id)) {
                ledgerPorEntregador.set(id, [])
            }
            ledgerPorEntregador.get(id)!.push(l)
        }

        const resultado = (resumoView.data || []).map(r => {
            const cashColetado = Number(r.total_cash_coletado)
            const taxaCash = Number(r.total_taxa_cash)
            const totalDigital = Number(r.total_digital)
            const qtdCash = Number(r.qtd_cash)
            const qtdDigital = Number(r.qtd_digital)
            return {
                entregador_id: r.entregador_id,
                nome: r.nome,
                chave_pix: r.chave_pix,
                total_cash_credito: cashColetado,
                total_cash_debito: taxaCash,
                total_digital: totalDigital,
                total_geral: cashColetado + totalDigital,
                qtd_cash_credito: qtdCash,
                qtd_cash_total: qtdCash,
                qtd_digital: qtdDigital,
                qtd_entregas: Number(r.qtd_total_entregas),
                saldo_cash_liquido: cashColetado - taxaCash,
            }
        })

        const totais = resultado.reduce((acc, r) => ({
            total_cash_credito: acc.total_cash_credito + r.total_cash_credito,
            total_cash_debito: acc.total_cash_debito + r.total_cash_debito,
            total_digital: acc.total_digital + r.total_digital,
            total_geral: acc.total_geral + r.total_geral,
            qtd_cash_credito: acc.qtd_cash_credito + r.qtd_cash_credito,
            qtd_cash_total: acc.qtd_cash_total + r.qtd_cash_total,
            qtd_digital: acc.qtd_digital + r.qtd_digital,
            qtd_entregas: acc.qtd_entregas + r.qtd_entregas,
        }), {
            total_cash_credito: 0,
            total_cash_debito: 0,
            total_digital: 0,
            total_geral: 0,
            qtd_cash_credito: 0,
            qtd_cash_total: 0,
            qtd_digital: 0,
            qtd_entregas: 0,
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


