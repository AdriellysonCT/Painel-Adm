import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id_fechamento, observacoes } = body

        if (!id_fechamento) {
            return NextResponse.json({ error: 'ID do fechamento é obrigatório' }, { status: 400 })
        }

        // Buscar fechamento
        const { data: fechamento, error: fetchError } = await supabase
            .from('fechamentos_caixa')
            .select('*')
            .eq('id', id_fechamento)
            .single()

        if (fetchError || !fechamento) {
            return NextResponse.json({ error: 'Fechamento não encontrado' }, { status: 404 })
        }

        if (fechamento.status !== 'pendente') {
            return NextResponse.json({ error: 'Fechamento já foi processado' }, { status: 400 })
        }

        // Atualizar status do fechamento
        const { error: updateError } = await supabase
            .from('fechamentos_caixa')
            .update({ 
                status: 'aprovado',
                observacoes: observacoes || fechamento.observacoes
            })
            .eq('id', id_fechamento)

        if (updateError) throw updateError

        // Buscar carteira do usuário
        const { data: carteira } = await supabase
            .from('carteiras')
            .select('id')
            .eq('id_usuario', fechamento.id_usuario)
            .eq('tipo_usuario', fechamento.tipo_usuario)
            .single()

        if (carteira) {
            // Criar movimentação de saída (repasse aprovado)
            await supabase
                .from('movimentacoes_carteira')
                .insert({
                    id_carteira: carteira.id,
                    tipo: 'saida',
                    origem: 'fechamento_caixa',
                    referencia_id: id_fechamento,
                    descricao: `Fechamento de caixa - ${new Date(fechamento.data_fechamento).toLocaleDateString('pt-BR')}`,
                    valor: fechamento.total_liquido,
                    status: 'confirmado'
                })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro ao aprovar fechamento:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
