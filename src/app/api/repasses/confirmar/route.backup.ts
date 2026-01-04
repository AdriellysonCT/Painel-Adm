import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabaseClient'

type Body = {
    repasseId: string
    restauranteId: string
    valor: number
    adminId?: string | null
    comprovanteUrl?: string | null
    observacao?: string | null
}

export async function POST(request: Request) {
    const authCookie = (await cookies()).get('admin_token')?.value
    if (!authCookie) {
        return NextResponse.json({ ok: false, message: 'Não autorizado' }, { status: 401 })
    }

    let body: Body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ ok: false, message: 'Payload inválido' }, { status: 400 })
    }

    const { repasseId, restauranteId, valor, adminId = null, comprovanteUrl = null, observacao = null } = body
    if (!repasseId || !restauranteId || !valor || valor <= 0) {
        return NextResponse.json({ ok: false, message: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // Chama função SQL no Supabase (precisa existir com SECURITY DEFINER)
    const { error } = await supabase.rpc('confirmar_repasso_manual', {
        p_id_repasso: repasseId,
        p_id_restaurante: restauranteId,
        p_valor: valor,
        p_admin_id: adminId,
        p_comprovante_url: comprovanteUrl,
        p_observacao: observacao,
    })

    if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
}






