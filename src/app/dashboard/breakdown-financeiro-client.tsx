"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrencyBRL } from "@/components/format"
import { DollarSign, TrendingUp, Package, Calendar, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ItemVenda = {
    numero_pedido: number
    data: string
    restaurante: string
    qtd_itens: number
    taxa_total: number
    valor_produtos: number
}

type ResumoGeral = {
    faturamento_total: number
    faturamento_hoje: number
    faturamento_mes: number
    faturamento_mes_anterior: number
    qtd_pedidos: number
    qtd_itens: number
    taxa_media: number
    crescimento_percentual: number
}

export default function BreakdownFinanceiroClient() {
    const [vendas, setVendas] = useState<ItemVenda[]>([])
    const [resumo, setResumo] = useState<ResumoGeral | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false) // Novo estado para refresh silencioso
    const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'total'>('mes')

    const carregarDados = async (isAutoRefresh = false) => {
        if (!isAutoRefresh) setLoading(true)
        else setRefreshing(true)
        
        try {
            const res = await fetch(`/api/faturamento-plataforma?periodo=${periodo}`)
            const data = await res.json()
            
            if (res.ok) {
                setVendas(data.vendas || [])
                setResumo(data.resumo || null)
                console.log('✅ Dados atualizados:', new Date().toLocaleTimeString())
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar faturamento:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // Carregamento inicial e quando muda o período
    useEffect(() => {
        carregarDados()
    }, [periodo])

    // Setup do Auto-Refresh (a cada 30 segundos)
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('🔄 Iniciando auto-refresh...');
            carregarDados(true)
        }, 30000) // 30 segundos

        return () => clearInterval(interval)
    }, [periodo]) // Reinicia o timer se o período mudar

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
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">💰 Seu Faturamento</h2>
                        {refreshing && (
                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 animate-pulse bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Sincronizando...
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        Taxas cobradas por item vendido (R$ 0,70 ou R$ 1,00)
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-1 border rounded-lg p-1">
                        <Button 
                            variant={periodo === 'hoje' ? 'default' : 'ghost'} 
                            size="sm"
                            onClick={() => setPeriodo('hoje')}
                        >
                            Hoje
                        </Button>
                        <Button 
                            variant={periodo === 'semana' ? 'default' : 'ghost'} 
                            size="sm"
                            onClick={() => setPeriodo('semana')}
                        >
                            7 dias
                        </Button>
                        <Button 
                            variant={periodo === 'mes' ? 'default' : 'ghost'} 
                            size="sm"
                            onClick={() => setPeriodo('mes')}
                        >
                            30 dias
                        </Button>
                        <Button 
                            variant={periodo === 'total' ? 'default' : 'ghost'} 
                            size="sm"
                            onClick={() => setPeriodo('total')}
                        >
                            Total
                        </Button>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => carregarDados(false)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Cards de Resumo */}
            {resumo && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Faturamento Total */}
                    <Card className="border-emerald-200 bg-linear-to-br from-emerald-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Faturamento no Período
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">
                                {formatCurrencyBRL(resumo.faturamento_total)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {resumo.qtd_pedidos} {resumo.qtd_pedidos === 1 ? 'pedido' : 'pedidos'} • {resumo.qtd_itens} {resumo.qtd_itens === 1 ? 'item' : 'itens'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Faturamento do Mês */}
                    <Card className="border-blue-200 bg-linear-to-br from-blue-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Faturamento do Mês
                            </CardTitle>
                            {crescimentoPositivo ? (
                                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrencyBRL(resumo.faturamento_mes)}
                            </div>
                            <p className={`text-xs mt-1 ${crescimentoPositivo ? 'text-emerald-600' : 'text-red-600'}`}>
                                {crescimentoPositivo ? '+' : ''}{resumo.crescimento_percentual.toFixed(1)}% vs mês anterior
                            </p>
                        </CardContent>
                    </Card>

                    {/* Taxa Média */}
                    <Card className="border-purple-200 bg-linear-to-br from-purple-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Taxa Média por Pedido
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {formatCurrencyBRL(resumo.taxa_media)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Média de taxa cobrada
                            </p>
                        </CardContent>
                    </Card>

                    {/* Faturamento Hoje */}
                    <Card className="border-orange-200 bg-linear-to-br from-orange-50 to-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Faturamento Hoje
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {formatCurrencyBRL(resumo.faturamento_hoje)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ganhos de hoje
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabela de Vendas */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento por Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                    {vendas.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma venda encontrada no período selecionado
                        </p>
                    ) : (
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Pedido</TableHead>
                                        <TableHead className="w-[120px]">Data</TableHead>
                                        <TableHead className="min-w-[150px]">Restaurante</TableHead>
                                        <TableHead className="text-center">Itens</TableHead>
                                        <TableHead className="text-right">Valor Produtos</TableHead>
                                        <TableHead className="text-right bg-emerald-50 font-semibold">Sua Taxa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendas.map((venda) => (
                                        <TableRow key={venda.numero_pedido}>
                                            <TableCell className="font-medium">
                                                #{venda.numero_pedido}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(venda.data).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {venda.restaurante}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-xs">
                                                    {venda.qtd_itens} {venda.qtd_itens === 1 ? 'item' : 'itens'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatCurrencyBRL(venda.valor_produtos)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 bg-emerald-50">
                                                {formatCurrencyBRL(venda.taxa_total)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Informações do Modelo */}
            <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-900">💡 Como funciona sua taxa</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800 space-y-2">
                    <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                            <strong>Produtos até R$ 5,00:</strong> Taxa de R$ 0,70 por item
                            <p className="text-xs text-blue-600 mt-1">Exemplo: Água R$ 2,00 → Cliente paga R$ 2,70 (você ganha R$ 0,70)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                            <strong>Produtos acima de R$ 5,00:</strong> Taxa de R$ 1,00 por item
                            <p className="text-xs text-blue-600 mt-1">Exemplo: Bolo R$ 10,00 → Cliente paga R$ 11,00 (você ganha R$ 1,00)</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-blue-200">
                        <p className="text-xs">
                            <strong>Importante:</strong> Você não cobra taxa do restaurante nem do entregador. 
                            Sua receita vem exclusivamente da taxa cobrada do cliente final.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
