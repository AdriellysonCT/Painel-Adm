import { createServerClient } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient()
        
        // Pegar filtro da query string
        const searchParams = request.nextUrl.searchParams
        const filtro = searchParams.get('tipo') // 'entregador', 'restaurante' ou null (todos)
        
        // Buscar da view unificada
        let query = supabase
            .from('view_pagamentos_unificada')
            .select('*')
        
        // Aplicar filtro se fornecido
        if (filtro && (filtro === 'entregador' || filtro === 'restaurante')) {
            query = query.eq('tipo_usuario', filtro)
        }
        
        const { data, error } = await query
            .order('tipo_usuario')
            .order('deve_pagar_hoje', { ascending: false })
            .order('saldo_disponivel', { ascending: false })
        
        if (error) {
            console.error('❌ Erro ao buscar pendentes:', error)
            return NextResponse.json({ 
                error: error.message,
                details: 'Erro ao buscar para pagamento'
            }, { status: 500 })
        }
        
        // Separar por tipo e urgência
        const entregadores = data?.filter(e => e.tipo_usuario === 'entregador') || []
        const restaurantes = data?.filter(e => e.tipo_usuario === 'restaurante') || []
        const hoje = data?.filter(e => e.deve_pagar_hoje) || []
        const proximos = data?.filter(e => !e.deve_pagar_hoje) || []
        const alertas = data?.filter(e => e.status_validacao !== 'OK') || []
        
        console.log('✅ Pagamentos pendentes:', {
            total: data?.length || 0,
            entregadores: entregadores.length,
            restaurantes: restaurantes.length,
            hoje: hoje.length,
            proximos: proximos.length,
            alertas: alertas.length
        })
        
        return NextResponse.json({
            todos: data || [],
            entregadores,
            restaurantes,
            hoje,
            proximos,
            alertas,
            resumo: {
                total: data?.length || 0,
                total_entregadores: entregadores.length,
                total_restaurantes: restaurantes.length,
                total_hoje: hoje.length,
                total_proximos: proximos.length,
                total_alertas: alertas.length,
                valor_total_hoje: hoje.reduce((acc, e) => acc + parseFloat(e.saldo_disponivel || 0), 0),
                valor_total_geral: data?.reduce((acc, e) => acc + parseFloat(e.saldo_disponivel || 0), 0) || 0,
                valor_entregadores: entregadores.reduce((acc, e) => acc + parseFloat(e.saldo_disponivel || 0), 0),
                valor_restaurantes: restaurantes.reduce((acc, e) => acc + parseFloat(e.saldo_disponivel || 0), 0)
            }
        })
    } catch (error) {
        console.error('❌ Erro inesperado:', error)
        return NextResponse.json({ 
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 })
    }
}
