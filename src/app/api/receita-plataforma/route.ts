import { createServerClient } from "@/lib/supabaseClient"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = createServerClient()
        
        // Buscar receita diária
        const { data: receitaDiaria, error: errorDiaria } = await supabase
            .from('view_receita_plataforma')
            .select('*')
            .order('data', { ascending: false })
            .limit(30) // Últimos 30 dias
        
        if (errorDiaria) {
            console.error('❌ Erro ao buscar receita diária:', errorDiaria)
            return NextResponse.json({ 
                error: errorDiaria.message 
            }, { status: 500 })
        }
        
        // Buscar resumo geral
        const { data: resumoGeral, error: errorResumo } = await supabase
            .rpc('calcular_resumo_receita_plataforma')
        
        // Se a function não existir, calcular manualmente
        let resumo = {
            receita_total: 0,
            receita_mes_atual: 0,
            receita_mes_anterior: 0,
            qtd_pedidos_total: 0,
            qtd_pedidos_mes: 0,
            taxa_media: 0,
            crescimento_percentual: 0
        }
        
        if (receitaDiaria && receitaDiaria.length > 0) {
            const hoje = new Date()
            const mesAtual = hoje.getMonth()
            const anoAtual = hoje.getFullYear()
            const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1
            const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual
            
            resumo.receita_total = receitaDiaria.reduce((acc, r) => acc + parseFloat(r.receita_dia || 0), 0)
            resumo.qtd_pedidos_total = receitaDiaria.reduce((acc, r) => acc + (r.qtd_pedidos || 0), 0)
            
            // Receita do mês atual
            const receitaMesAtual = receitaDiaria.filter(r => {
                const data = new Date(r.data)
                return data.getMonth() === mesAtual && data.getFullYear() === anoAtual
            })
            resumo.receita_mes_atual = receitaMesAtual.reduce((acc, r) => acc + parseFloat(r.receita_dia || 0), 0)
            resumo.qtd_pedidos_mes = receitaMesAtual.reduce((acc, r) => acc + (r.qtd_pedidos || 0), 0)
            
            // Receita do mês anterior
            const receitaMesAnterior = receitaDiaria.filter(r => {
                const data = new Date(r.data)
                return data.getMonth() === mesAnterior && data.getFullYear() === anoMesAnterior
            })
            resumo.receita_mes_anterior = receitaMesAnterior.reduce((acc, r) => acc + parseFloat(r.receita_dia || 0), 0)
            
            // Taxa média
            resumo.taxa_media = resumo.qtd_pedidos_total > 0 
                ? resumo.receita_total / resumo.qtd_pedidos_total 
                : 0
            
            // Crescimento percentual
            if (resumo.receita_mes_anterior > 0) {
                resumo.crescimento_percentual = 
                    ((resumo.receita_mes_atual - resumo.receita_mes_anterior) / resumo.receita_mes_anterior) * 100
            }
        }
        
        // Buscar top restaurantes por taxa gerada
        const { data: topRestaurantes, error: errorTop } = await supabase
            .from('view_resumo_repasses_restaurante')
            .select('nome_fantasia, total_taxa_plataforma, qtd_pedidos, qtd_itens_total')
            .order('total_taxa_plataforma', { ascending: false })
            .limit(10)
        
        console.log('✅ Receita da plataforma:', {
            receita_total: resumo.receita_total,
            receita_mes: resumo.receita_mes_atual,
            qtd_pedidos: resumo.qtd_pedidos_total
        })
        
        return NextResponse.json({
            receita_diaria: receitaDiaria || [],
            resumo,
            top_restaurantes: topRestaurantes || []
        })
        
    } catch (error) {
        console.error('❌ Erro inesperado:', error)
        return NextResponse.json({ 
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 })
    }
}
