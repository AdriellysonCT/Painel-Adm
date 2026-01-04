import { createServerClient } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"
import { Download } from "lucide-react"

type ResumoRestaurante = {
    id_restaurante: string
    total_vendas_confirmadas: number
    total_repassado: number
    saldo_pendente: number
    ultima_atualizacao?: string | null
    restaurantes_app?: { nome_fantasia?: string | null } | null
}

type HistoricoItem = {
    id_movimentacao: string | null
    id_usuario: string | null
    tipo_usuario?: string | null
    tipo: string | null
    descricao: string | null
    valor: number | null
    status: string | null
    criado_em: string | null
    restaurantes_app?: { nome_fantasia?: string | null } | null
}

async function fetchResumoPorRestaurante(): Promise<ResumoRestaurante[]> {
    const supabase = createServerClient()
    
    // Buscar apenas restaurantes com vendas confirmadas (> 0)
    const { data, error } = await supabase
        .from('repasses_restaurantes')
        .select('id_restaurante, total_vendas_confirmadas, total_repassado, saldo_pendente, ultima_atualizacao')
        .gt('total_vendas_confirmadas', 0)
        .order('saldo_pendente', { ascending: false })

    if (error || !data) return []
    
    // Buscar nomes dos restaurantes separadamente
    const ids = data.map(r => r.id_restaurante)
    const { data: restaurantesData } = await supabase
        .from('restaurantes_app')
        .select('id, nome_fantasia')
        .in('id', ids)
    
    // Mapear nomes
    const nomesMap = new Map<string, string>()
    for (const rest of (restaurantesData || [])) {
        nomesMap.set(rest.id, rest.nome_fantasia || '')
    }
    
    // Combinar dados
    return data.map(r => ({
        ...r,
        restaurantes_app: { nome_fantasia: nomesMap.get(r.id_restaurante) || null }
    })) as ResumoRestaurante[]
}

// Falhas agora são calculadas no client de acordo com o modo selecionado

async function fetchHistorico(tipo: 'restaurante' | 'entregador'): Promise<HistoricoItem[]> {
    const supabase = createServerClient()
    
    // Buscar da view sem embed
    const { data, error } = await supabase
        .from('view_extrato_carteira')
        .select('id_movimentacao, id_usuario, tipo_usuario, tipo, descricao, valor, status, criado_em')
        .eq('tipo_usuario', tipo)
        .order('criado_em', { ascending: false })
        .limit(50)
    
    if (error || !data) return []
    
    // Buscar nomes separadamente
    const ids = [...new Set(data.map(d => d.id_usuario))]
    
    if (tipo === 'restaurante') {
        const { data: restaurantesData } = await supabase
            .from('restaurantes_app')
            .select('id, nome_fantasia')
            .in('id', ids)
        
        const nomesMap = new Map<string, string>()
        for (const rest of (restaurantesData || [])) {
            nomesMap.set(rest.id, rest.nome_fantasia || '')
        }
        
        return data.map(d => ({
            ...d,
            restaurantes_app: { nome_fantasia: nomesMap.get(d.id_usuario || '') || null }
        })) as HistoricoItem[]
    } else {
        const { data: entregadoresData } = await supabase
            .from('entregadores_app')
            .select('id, nome')
            .in('id', ids)
        
        const nomesMap = new Map<string, string>()
        for (const ent of (entregadoresData || [])) {
            nomesMap.set(ent.id, ent.nome || '')
        }
        
        return data.map(d => ({
            ...d,
            restaurantes_app: { nome_fantasia: nomesMap.get(d.id_usuario || '') || null }
        })) as HistoricoItem[]
    }
}

// agregado antigo removido (não é mais usado neste schema)

export default async function DashboardPage() {
	return (
		<div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img 
                        src="/fome-ninja-logo.png" 
                        alt="Fome Ninja Logo" 
                        className="w-20 h-20 md:w-24 md:h-24 object-contain"
                    />
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            <span className="text-emerald-600">Fome</span>
                            <span className="text-foreground">Ninja</span>
                        </h1>
                        <h2 className="text-base md:text-lg text-foreground/80">Painel administrativo</h2>
                        <p className="text-sm text-muted-foreground">Resumo de repasses, extratos e saldos.</p>
                    </div>
                </div>
            </div>
            <Suspense>
                <DashboardWrapperClient />
            </Suspense>
		</div>
	)
}

// tabela de histórico movida para componente client em abas

function RestaurantDetailsButton({ restauranteId, nome }: { restauranteId: string; nome: string }) {
	return (
		<Suspense>
			<RestaurantDetailsDialog restauranteId={restauranteId} nome={nome} />
		</Suspense>
	)
}

import RestaurantDetailsDialog from './restaurant-details-client'
import DashboardWrapperClient from './dashboard-wrapper-client'


