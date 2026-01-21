import { createServerClient } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { id_movimentacao, comprovante_url } = body
        
        // Validações básicas
        if (!id_movimentacao) {
            return NextResponse.json({ 
                error: 'Dados incompletos',
                details: 'id_movimentacao é obrigatório'
            }, { status: 400 })
        }
        
        const supabase = createServerClient()
        
        // Chamar function do banco que confirma o pagamento
        const { data, error } = await supabase.rpc('confirmar_pagamento_entregador', {
            p_id_movimentacao: id_movimentacao,
            p_comprovante_url: comprovante_url || null,
            p_admin_id: null // TODO: pegar do auth
        })
        
        if (error) {
            console.error('❌ Erro ao confirmar pagamento:', error)
            return NextResponse.json({ 
                error: error.message,
                details: 'Erro ao confirmar pagamento no banco de dados'
            }, { status: 500 })
        }
        
        const resultado = data?.[0]
        
        if (!resultado?.sucesso) {
            console.warn('⚠️ Pagamento não confirmado:', resultado?.mensagem)
            return NextResponse.json({ 
                error: resultado?.mensagem || 'Falha ao confirmar pagamento'
            }, { status: 400 })
        }
        
        console.log('✅ Pagamento confirmado:', {
            id_movimentacao,
            comprovante_url
        })
        
        // TODO: Enviar notificação push para o entregador
        
        return NextResponse.json({
            sucesso: true,
            mensagem: resultado.mensagem
        })
        
    } catch (error) {
        console.error('❌ Erro inesperado ao confirmar pagamento:', error)
        return NextResponse.json({ 
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 })
    }
}
