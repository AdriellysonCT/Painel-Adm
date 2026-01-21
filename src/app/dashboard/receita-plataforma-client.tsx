"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrencyBRL } from "@/components/format"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReceitaDiaria = {
    data: string
    qtd_pedidos: number
    qtd_itens_total: number
    receita_dia: number
    taxa_media_pedido: number
    valor_restaurantes: number
    valor_entregadores: number
}

type Resumo = {
    receita_total: number
    receita_mes_atual: number
    receita_mes_anterior: number
    qtd_pedidos_total: number
    qtd_pedidos_mes: number
    taxa_media: number
    crescimento_percentual: number
}

type TopRestaurante = {
    nome_fantasia: string
    total_taxa_plataforma: number
    qtd_pedidos: number
    qtd_itens_total: number
}

export default function ReceitaPlataformaClient() {
    const [receitaDiaria, setReceitaDiaria] = useState<ReceitaDiaria[]>([])
    const [resumo, setResumo] = useState<Resumo | null>(null)
    const [topRestaurantes, setTopRestaurantes] = useState<TopRestaurante[]>([])
    const [loading, setLoading] = useState(true)

    const carregarDados = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/receita-plataforma')
            const data = await res.json()
            
            if (res.ok) {
                setReceitaDiaria(data.receita_diaria || [])
                setResumo(data.resumo || null)
                setTopRestaurantes(data.top_restaurantes || [])
            } else {
                console.error('Erro ao carregar dados:', data.error)
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        carregarDados()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    const crescimentoPositivo = (resumo?.crescimento_percentual || 0) >= 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Receita da Plataforma</h2>
                    <p className="text-muted-foreground">
                        Acompanhe a receita gerada pela taxa por item
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={carregarDados}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Cards de Resumo */}
            {resumo && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Receita Total */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Receita Total
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrencyBRL(resumo.receita_total)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Desde o início
                            </p>
                        </CardContent>
                    </Card>

                    {/* Receita do Mês */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Receita do Mês
                            </CardTitle>
                            {crescimentoPositivo ? (
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrencyBRL(resumo.receita_mes_atual)}
                            </div>
                            <p className={`text-xs ${crescimentoPositivo ? 'text-emerald-600' : 'text-red-600'}`}>
                                {crescimentoPositivo ? '+' : ''}{resumo.crescimento_percentual.toFixed(1)}% vs mês anterior
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total de Pedidos */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total de Pedidos
                            </CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {resumo.qtd_pedidos_total}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {resumo.qtd_pedidos_mes} neste mês
                            </p>
                        </CardContent>
                    </Card>

                    {/* Taxa Média */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Taxa Média
                            </CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrencyBRL(resumo.taxa_media)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Por pedido
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Receita Diária */}
            <Card>
                <CardHeader>
                    <CardTitle>Receita Diária (Últimos 30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                    {receitaDiaria.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma receita registrada ainda
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {receitaDiaria.slice(0, 10).map((dia) => (
                                <div 
                                    key={dia.data} 
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {new Date(dia.data).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {dia.qtd_pedidos} pedidos • {dia.qtd_itens_total} itens
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-emerald-600">
                                            {formatCurrencyBRL(dia.receita_dia)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Média: {formatCurrencyBRL(dia.taxa_media_pedido)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Restaurantes */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Restaurantes por Receita Gerada</CardTitle>
                </CardHeader>
                <CardContent>
                    {topRestaurantes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhum restaurante com receita ainda
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {topRestaurantes.map((rest, index) => (
                                <div 
                                    key={rest.nome_fantasia} 
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium">{rest.nome_fantasia}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {rest.qtd_pedidos} pedidos • {rest.qtd_itens_total} itens
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-emerald-600">
                                            {formatCurrencyBRL(parseFloat(rest.total_taxa_plataforma.toString()))}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Taxa gerada
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Informações do Modelo */}
            <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-900">💡 Modelo de Taxa</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800 space-y-2">
                    <p>
                        <strong>Regra:</strong> R$ 1,00 para itens ≥ R$ 5,00 | R$ 0,70 para itens &lt; R$ 5,00
                    </p>
                    <p>
                        <strong>Vantagem:</strong> Restaurante recebe ~97% vs 73% do iFood
                    </p>
                    <p>
                        <strong>Taxa de entrega:</strong> 100% para o entregador
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
