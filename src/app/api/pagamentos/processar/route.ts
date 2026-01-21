import { createServerClient } from "@/lib/supabaseClient"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { id_entregador, valor, chave_pix, observacao } = body
        
        // Validações básicas
        if (!id_entregador || !valor || !chave_pix) {
            return NextResponse.json({ 
                error: 'Dados incompletos',
                details: 'id_entregador, valor e chave_pix são obrigatórios'
            }, { status: 400 })
        }
        
        if (valor <= 0) {
            return NextResponse.json({ 
                error: 'Valor inválido',
                details: 'O valor deve ser maior que zero'
            }, { status: 400 })
        }
        
        const supabase = createServerClient()
        
        // Chamar function do banco que faz todas as validações
        const { data, error } = await supabase.rpc('processar_pagamento_entregador', {
            p_id_entregador: id_entregador,
            p_valor: valor,
            p_chave_pix: chave_pix,
            p_admin_id: null, // TODO: pegar do auth
            p_observacao: observacao || null
        })
        
        if (error) {
            console.error('❌ Erro ao processar pagamento:', error)
            return NextResponse.json({ 
                error: error.message,
                details: 'Erro ao processar pagamento no banco de dados'
            }, { status: 500 })
        }
        
        const resultado = data?.[0]
        
        if (!resultado?.sucesso) {
            console.warn('⚠️ Pagamento não processado:', resultado?.mensagem)
            return NextResponse.json({ 
                error: resultado?.mensagem || 'Falha ao processar pagamento',
                saldo_anterior: resultado?.saldo_anterior,
                saldo_posterior: resultado?.saldo_posterior
            }, { status: 400 })
        }
        
        console.log('✅ Pagamento processado:', {
            id_movimentacao: resultado.id_movimentacao,
            valor,
            saldo_anterior: resultado.saldo_anterior,
            saldo_posterior: resultado.saldo_posterior
        })
        
        return NextResponse.json({
            sucesso: true,
            mensagem: resultado.mensagem,
            id_movimentacao: resultado.id_movimentacao,
            saldo_anterior: resultado.saldo_anterior,
            saldo_posterior: resultado.saldo_posterior
        })
        
    } catch (error) {
        console.error('❌ Erro inesperado ao processar pagamento:', error)
        return NextResponse.json({ 
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 })
    }
}
