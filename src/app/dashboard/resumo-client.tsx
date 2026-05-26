"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import ResumoRestaurantesClient from "./resumo-restaurantes-client"
import ResumoEntregadoresClient from "./resumo-entregadores-client"

type Modo = 'restaurante' | 'entregador'

type ResumoRestaurante = {
    id_restaurante: string
    total_vendas_confirmadas: number
    total_repassado: number
    saldo_pendente: number
    restaurantes_app?: { nome_fantasia?: string | null } | null
}

type ResumoEntregador = {
    id_entregador: string
    total_entregas: number
    total_recebido: number
    saldo_pendente: number
    nome: string
}

export default function ResumoClient({ modo }: { modo: Modo }) {
    const [restaurantes, setRestaurantes] = useState<ResumoRestaurante[]>([])
    const [entregadores, setEntregadores] = useState<ResumoEntregador[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0) // Key para forçar refresh

    const handleUpdate = () => {
        console.log('🔄 Atualizando dados após confirmação de pagamento...')
        setRefreshKey(prev => prev + 1) // Incrementa para forçar re-fetch
    }

    useEffect(() => {
        let mounted = true
        ;(async () => {
            setLoading(true)
            
            if (modo === 'restaurante') {
                // Buscar restaurantes
                const { data } = await supabase
                    .from('repasses_restaurantes')
                    .select('id_restaurante, total_vendas_confirmadas, total_repassado, saldo_pendente')
                    .gt('total_vendas_confirmadas', 0)
                    .order('saldo_pendente', { ascending: false })

                if (!mounted || !data) return

                const ids = data.map(r => r.id_restaurante)
                const { data: restaurantesData } = await supabase
                    .from('restaurantes_app')
                    .select('id, nome_fantasia')
                    .in('id', ids)

                const nomesMap = new Map<string, string>()
                for (const rest of (restaurantesData || [])) {
                    nomesMap.set(rest.id, rest.nome_fantasia || '')
                }

                const result = data.map(r => ({
                    ...r,
                    restaurantes_app: { nome_fantasia: nomesMap.get(r.id_restaurante) || null }
                }))

                if (mounted) {
                    setRestaurantes(result)
                    setLoading(false)
                }
            } else {
                // Buscar entregadores - usar mesma lógica do RepassesDashboardClient
                const { data: movs } = await supabase
                    .from('view_extrato_carteira')
                    .select('id_usuario, valor, status, tipo')
                    .eq('tipo_usuario', 'entregador')

                console.log('🔍 Resumo Entregadores - Movimentações:', movs)

                if (!mounted || !movs) {
                    setEntregadores([])
                    setLoading(false)
                    return
                }

                const saldos = new Map<string, number>()
                const allRows = movs
                
                // Calcular saldo: entradas (confirmadas + pendentes) - saídas (pagas)
                for (const r of allRows) {
                    const v = Number(r.valor || 0)
                    const tipo = (r.tipo || '').toLowerCase()
                    const status = (r.status || '').toLowerCase()
                    
                    console.log(`📊 Processando: ID=${r.id_usuario}, Tipo=${tipo}, Status=${status}, Valor=${v}`)
                    
                    const prev = saldos.get(r.id_usuario) || 0
                    
                    // Entrada pendente ou confirmada = dinheiro que o entregador tem a receber
                    if (tipo === 'entrada' && (status === 'pendente' || status === 'confirmado')) {
                        saldos.set(r.id_usuario, prev + v)
                        console.log(`  ✅ Somando entrada: ${prev} + ${v} = ${prev + v}`)
                    } 
                    // Saída paga ou repassada = dinheiro já repassado ao entregador
                    else if (tipo === 'saida' && (status === 'pago' || status === 'repassado')) {
                        saldos.set(r.id_usuario, prev - v)
                        console.log(`  ➖ Subtraindo saída paga/repassada: ${prev} - ${v} = ${prev - v}`)
                    }
                }

                console.log('🔍 Resumo Entregadores - Saldos calculados:', Array.from(saldos.entries()))

                // Filtrar apenas entregadores com saldo != 0
                const idsComMovimentacao = [...new Set(allRows.map(r => r.id_usuario))]
                const ids = idsComMovimentacao.filter(id => {
                    const saldo = saldos.get(id) || 0
                    return saldo !== 0
                })
                
                console.log('🔍 IDs com movimentação:', ids)
                
                if (ids.length === 0) {
                    if (mounted) {
                        setEntregadores([])
                        setLoading(false)
                    }
                    return
                }

                const { data: entData } = await supabase
                    .from('entregadores_app')
                    .select('id, nome')
                    .in('id', ids)

                const nomesMap = new Map<string, string>()
                for (const ent of (entData || [])) {
                    nomesMap.set(ent.id, ent.nome || '')
                }

                // Calcular totais para cada entregador
                const totaisMap = new Map<string, { entradas: number; saidas: number }>()
                for (const r of allRows) {
                    if (!totaisMap.has(r.id_usuario)) {
                        totaisMap.set(r.id_usuario, { entradas: 0, saidas: 0 })
                    }
                    const t = totaisMap.get(r.id_usuario)!
                    const v = Number(r.valor || 0)
                    const tipo = (r.tipo || '').toLowerCase()
                    const status = (r.status || '').toLowerCase()
                    
                    // Total de entregas = todas as entradas (pendentes + confirmadas)
                    if (tipo === 'entrada' && (status === 'pendente' || status === 'confirmado')) {
                        t.entradas += v
                    } 
                    // Total recebido = saídas pagas ou repassadas
                    else if (tipo === 'saida' && (status === 'pago' || status === 'repassado')) {
                        t.saidas += v
                    }
                }

                const result: ResumoEntregador[] = ids.map(id => {
                    const saldo = saldos.get(id) || 0
                    const totais = totaisMap.get(id) || { entradas: 0, saidas: 0 }
                    return {
                        id_entregador: id,
                        nome: nomesMap.get(id) || `Entregador #${id.substring(0, 8)}`,
                        total_entregas: totais.entradas,
                        total_recebido: totais.saidas,
                        saldo_pendente: Math.abs(saldo)
                    }
                }).sort((a, b) => b.saldo_pendente - a.saldo_pendente)
                
                console.log('🔍 Resultado final:', result)

                if (mounted) {
                    setEntregadores(result)
                    setLoading(false)
                }
            }
        })()
        
        return () => { mounted = false }
    }, [modo, refreshKey]) // Adiciona refreshKey como dependência

    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Carregando...</div>
    }

    if (modo === 'restaurante') {
        return <ResumoRestaurantesClient items={restaurantes} onUpdate={handleUpdate} />
    } else {
        return <ResumoEntregadoresClient items={entregadores} onUpdate={handleUpdate} />
    }
}
