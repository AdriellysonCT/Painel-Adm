"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import HistoricoTabsClient from "./historico-tabs-client"

type Modo = 'restaurante' | 'entregador'

type HistoricoItem = {
    id_movimentacao: string | null
    id_usuario: string | null
    tipo_usuario?: string | null
    tipo: string | null
    descricao: string | null
    valor: number | null
    status: string | null
    criado_em: string | null
    tipo_pedido?: string | null
    restaurantes_app?: { nome_fantasia?: string | null } | null
}

export default function HistoricoClient({ modo, usuarioId }: { modo: Modo; usuarioId?: string }) {
    const [items, setItems] = useState<HistoricoItem[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let mounted = true
        ;(async () => {
            setLoading(true)
            
            // Buscar movimentações
            let query = supabase
                .from('view_extrato_carteira')
                .select('id_movimentacao, id_usuario, tipo_usuario, tipo, descricao, valor, status, criado_em, tipo_pedido')
                .eq('tipo_usuario', modo)
            
            // Filtrar por usuário específico se selecionado
            if (usuarioId) {
                query = query.eq('id_usuario', usuarioId)
            }
            
            const { data } = await query
                .order('criado_em', { ascending: false })
                .limit(50)

            if (!mounted || !data) {
                setLoading(false)
                return
            }

            // Buscar nomes
            const ids = [...new Set(data.map(d => d.id_usuario))]
            
            if (modo === 'restaurante') {
                const { data: restaurantesData } = await supabase
                    .from('restaurantes_app')
                    .select('id, nome_fantasia')
                    .in('id', ids)

                const nomesMap = new Map<string, string>()
                for (const rest of (restaurantesData || [])) {
                    nomesMap.set(rest.id, rest.nome_fantasia || '')
                }

                const result = data.map(d => ({
                    ...d,
                    restaurantes_app: { nome_fantasia: nomesMap.get(d.id_usuario || '') || null }
                }))

                if (mounted) {
                    setItems(result)
                    setLoading(false)
                }
            } else {
                const { data: entregadoresData } = await supabase
                    .from('entregadores_app')
                    .select('id, nome')
                    .in('id', ids)

                const nomesMap = new Map<string, string>()
                for (const ent of (entregadoresData || [])) {
                    nomesMap.set(ent.id, ent.nome || '')
                }

                const result = data.map(d => ({
                    ...d,
                    restaurantes_app: { nome_fantasia: nomesMap.get(d.id_usuario || '') || null }
                }))

                if (mounted) {
                    setItems(result)
                    setLoading(false)
                }
            }
        })()

        return () => { mounted = false }
    }, [modo, usuarioId])

    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
    }

    return <HistoricoTabsClient modo={modo} restaurantes={items} entregadores={items} />
}
