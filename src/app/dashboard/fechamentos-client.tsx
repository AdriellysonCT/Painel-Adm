"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyBRL } from "@/components/format"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Clock, DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react"

type Fechamento = {
    id: string
    id_usuario: string
    tipo_usuario: 'restaurante' | 'entregador'
    nome_usuario: string
    data_abertura: string
    data_fechamento: string
    total_bruto: number
    total_descontos: number
    total_liquido: number
    qtd_transacoes: number
    status: 'pendente' | 'aprovado' | 'pago'
    observacoes: string | null
    criado_em: string
}

export default function FechamentosClient() {
    const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<'pendente' | 'aprovado' | 'todos'>('pendente')
    const [selectedFechamento, setSelectedFechamento] = useState<Fechamento | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [approving, setApproving] = useState(false)

    useEffect(() => {
        loadFechamentos()
    }, [status])

    async function loadFechamentos() {
        setLoading(true)
        try {
            const res = await fetch(`/api/fechamentos/listar?status=${status}`)
            const data = await res.json()
            setFechamentos(data)
        } catch (error) {
            console.error('Erro ao carregar fechamentos:', error)
        } finally {
            setLoading(false)
        }
    }

    async function aprovarFechamento(id: string) {
        setApproving(true)
        try {
            const res = await fetch('/api/fechamentos/aprovar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_fechamento: id })
            })

            if (!res.ok) throw new Error('Falha ao aprovar')

            setDialogOpen(false)
            setSelectedFechamento(null)
            loadFechamentos()
        } catch (error) {
            console.error('Erro ao aprovar:', error)
        } finally {
            setApproving(false)
        }
    }

    const pendentes = fechamentos.filter(f => f.status === 'pendente')
    const totalPendente = pendentes.reduce((sum, f) => sum + f.total_liquido, 0)

    if (loading) {
        return <div className="text-center py-8">Carregando fechamentos...</div>
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900">Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">{pendentes.length}</div>
                        <p className="text-xs text-amber-700 mt-1">
                            {formatCurrencyBRL(totalPendente)} no total
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Aprovados Hoje</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">
                            {fechamentos.filter(f => f.status === 'aprovado' && 
                                new Date(f.criado_em).toDateString() === new Date().toDateString()
                            ).length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Total Processado</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {formatCurrencyBRL(
                                fechamentos
                                    .filter(f => f.status === 'aprovado')
                                    .reduce((sum, f) => sum + f.total_liquido, 0)
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Tabs value={status} onValueChange={(v) => setStatus(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                    <TabsTrigger value="aprovado">Aprovados</TabsTrigger>
                    <TabsTrigger value="todos">Todos</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Lista de Fechamentos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fechamentos.map((fechamento) => (
                    <Card 
                        key={fechamento.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                            fechamento.status === 'pendente' 
                                ? 'border-amber-200 bg-amber-50/30' 
                                : 'border-emerald-200 bg-emerald-50/30'
                        }`}
                        onClick={() => {
                            setSelectedFechamento(fechamento)
                            setDialogOpen(true)
                        }}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold">
                                        {fechamento.nome_usuario}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                                        {fechamento.tipo_usuario}
                                    </p>
                                </div>
                                <Badge variant={fechamento.status === 'pendente' ? 'default' : 'secondary'}>
                                    {fechamento.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Bruto
                                    </span>
                                    <span className="font-medium">{formatCurrencyBRL(fechamento.total_bruto)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        Descontos
                                    </span>
                                    <span className="font-medium text-red-600">
                                        -{formatCurrencyBRL(fechamento.total_descontos)}
                                    </span>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">Líquido</span>
                                    <span className="text-lg font-bold text-emerald-600">
                                        {formatCurrencyBRL(fechamento.total_liquido)}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 border-t">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(fechamento.data_fechamento).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span>{fechamento.qtd_transacoes} transações</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {fechamentos.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    Nenhum fechamento encontrado
                </div>
            )}

            {/* Dialog de Detalhes */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Fechamento</DialogTitle>
                    </DialogHeader>
                    {selectedFechamento && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Usuário</p>
                                <p className="font-semibold">{selectedFechamento.nome_usuario}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {selectedFechamento.tipo_usuario}
                                </p>
                            </div>

                            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                                <div className="flex justify-between">
                                    <span className="text-sm">Total Bruto</span>
                                    <span className="font-medium">{formatCurrencyBRL(selectedFechamento.total_bruto)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">Descontos</span>
                                    <span className="font-medium text-red-600">
                                        -{formatCurrencyBRL(selectedFechamento.total_descontos)}
                                    </span>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="flex justify-between">
                                    <span className="font-semibold">Total Líquido</span>
                                    <span className="text-lg font-bold text-emerald-600">
                                        {formatCurrencyBRL(selectedFechamento.total_liquido)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Período</p>
                                <p className="text-sm">
                                    {new Date(selectedFechamento.data_abertura).toLocaleDateString('pt-BR')} até{' '}
                                    {new Date(selectedFechamento.data_fechamento).toLocaleDateString('pt-BR')}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Transações</p>
                                <p className="text-sm">{selectedFechamento.qtd_transacoes} movimentações</p>
                            </div>

                            {selectedFechamento.observacoes && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Observações</p>
                                    <p className="text-sm">{selectedFechamento.observacoes}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Fechar
                        </Button>
                        {selectedFechamento?.status === 'pendente' && (
                            <Button 
                                onClick={() => aprovarFechamento(selectedFechamento.id)}
                                disabled={approving}
                            >
                                {approving ? 'Aprovando...' : 'Aprovar Fechamento'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
