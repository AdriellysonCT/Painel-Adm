import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabaseClient'

type BodyV1 = { restauranteId: string; valor: number; comprovanteUrl?: string | null; observacao?: string | null }
type BodyV2 = { id_usuario: string; tipo_usuario: 'restaurante' | 'entregador'; valor: number; admin_id?: string | null; observacao?: string | null }

export async function POST(request: Request) {
    const authCookie = (await cookies()).get('admin_token')?.value
    if (!authCookie) {
        return NextResponse.json({ ok: false, message: 'Não autorizado' }, { status: 401 })
    }

    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ ok: false, message: 'Payload inválido' }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // Aceita os dois formatos: { restauranteId, valor } OU { id_usuario, tipo_usuario, valor }
    if (body?.restauranteId && body?.valor) {
        const b = body as BodyV1
        if (!b.restauranteId || !b.valor || b.valor <= 0) {
            return NextResponse.json({ ok: false, message: 'Dados obrigatórios ausentes' }, { status: 400 })
        }
        const { error } = await supabase.rpc('confirmar_repasso_manual', {
            p_id_restaurante: b.restauranteId,
            p_valor: b.valor,
            p_comprovante_url: b.comprovanteUrl || null,
            p_observacao: b.observacao || null,
        })
        if (error) {
            return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        }
        return NextResponse.json({ ok: true })
    }

    if (body?.id_usuario && body?.tipo_usuario && body?.valor) {
        const b = body as BodyV2
        if (!['restaurante','entregador'].includes(b.tipo_usuario) || b.valor <= 0) {
            return NextResponse.json({ ok: false, message: 'Dados obrigatórios ausentes' }, { status: 400 })
        }
        const { error } = await supabase.rpc('confirmar_repasso_manual', {
            p_id_usuario: b.id_usuario,
            p_tipo_usuario: b.tipo_usuario,
            p_valor: b.valor,
            p_admin_id: b.admin_id || null,
            p_observacao: b.observacao || null,
        })
        if (error) {
            return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        }
        return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, message: 'Formato de payload não suportado' }, { status: 400 })
}



