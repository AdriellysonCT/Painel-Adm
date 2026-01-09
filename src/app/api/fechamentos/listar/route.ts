import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'pendente'
        const tipo_usuario = searchParams.get('tipo_usuario')

        let query = supabase
            .from('fechamentos_caixa')
            .select('*')
            .order('criado_em', { ascending: false })

        if (status !== 'todos') {
            query = query.eq('status', status)
        }

        if (tipo_usuario) {
            query = query.eq('tipo_usuario', tipo_usuario)
        }

        const { data, error } = await query

        if (error) throw error

        // Buscar nomes dos usuários
        const restauranteIds = data?.filter(f => f.tipo_usuario === 'restaurante').map(f => f.id_usuario) || []
        const entregadorIds = data?.filter(f => f.tipo_usuario === 'entregador').map(f => f.id_usuario) || []

        const [restaurantes, entregadores] = await Promise.all([
            restauranteIds.length > 0 
                ? supabase.from('restaurantes_app').select('id, nome_fantasia').in('id', restauranteIds)
                : { data: [] },
            entregadorIds.length > 0
                ? supabase.from('entregadores_app').select('id, nome').in('id', entregadorIds)
                : { data: [] }
        ])

        const nomesMap = new Map()
        restaurantes.data?.forEach(r => nomesMap.set(r.id, r.nome_fantasia))
        entregadores.data?.forEach(e => nomesMap.set(e.id, e.nome))

        const result = data?.map(f => ({
            ...f,
            nome_usuario: nomesMap.get(f.id_usuario) || `#${f.id_usuario}`
        }))

        return NextResponse.json(result || [])
    } catch (error: any) {
        console.error('Erro ao listar fechamentos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
