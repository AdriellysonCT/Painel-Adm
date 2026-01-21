"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { formatCurrencyBRL } from "@/components/format"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type EntregadorPendente = {
    id: string
    nome: string
    tipo_usuario: 'entregador' | 'restaurante'
    chave_pix: string | null
    saldo_disponivel: number
    frequencia_pagamento: number
    descricao_frequencia: string
    proxima_data_pagamento: string
    deve_pagar_hoje: boolean
    status_validacao: string
    qtd_transacoes: number
    id_carteira: string | null
}

type Resumo = {
    total: number
    total_entregadores: number
    total_restaurantes: number
    total_hoje: number
    total_proximos: number
    total_alertas: number
    valor_total_hoje: number
    valor_total_geral: number
    valor_entregadores: number
    valor_restaurantes: number
}

export default function PagamentosPendentesClient() {
    const [entregadores, setEntregadores] = useState<EntregadorPendente[]>([])
    const [restaurantes, setRestaurantes] = useState<EntregadorPendente[]>([])
    const [hoje, setHoje] = useState<EntregadorPendente[]>([])
    const [proximos, setProximos] = useState<EntregadorPendente[]>([])
    const [alertas, setAlertas] = useState<EntregadorPendente[]>([])
    const [resumo, setResumo] = useState<Resumo | null>(null)
    const [loading, setLoading] = useState(true)
    const [processando, setProcessando] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [entregadorSelecionado, setEntregadorSelecionado] = useState<EntregadorPendente | null>(null)
    const [observacao, setObservacao] = useState("")
    const [copiado, setCopiado] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<'todos' | 'entregador' | 'restaurante'>('todos')

    const carregarDados = async (tipoFiltro?: 'todos' | 'entregador' | 'restaurante') => {
        setLoading(true)
        try {
            const filtroAtual = tipoFiltro || filtro
            const url = filtroAtual === 'todos' 
                ? '/api/entregadores/pendentes'
                : `/api/entregadores/pendentes?tipo=${filtroAtual}`
            
            const res = await fetch(url)
            const data = await res.json()
            
            if (res.ok) {
                setEntregadores(data.entregadores || [])
                setRestaurantes(data.restaurantes || [])
                setHoje(data.hoje || [])
                setProximos(data.proximos || [])
                setAlertas(data.alertas || [])
                setResumo(data.resumo || null)
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

    const handleFiltroChange = (novoFiltro: 'todos' | 'entregador' | 'restaurante') => {
        setFiltro(novoFiltro)
        carregarDados(novoFiltro)
    }

    const copiarChavePix = (chave: string, id: string) => {
        navigator.clipboard.writeText(chave)
        setCopiado(id)
        setTimeout(() => setCopiado(null), 2000)
    }

    const abrirDialogPagamento = (entregador: EntregadorPendente) => {
        setEntregadorSelecionado(entregador)
        setObservacao(`Pagamento ${entregador.descricao_frequencia} - ${new Date().toLocaleDateString('pt-BR')}`)
        setDialogOpen(true)
    }

    const processarPagamento = async () => {
        if (!entregadorSelecionado) return
        
        setProcessando(entregadorSelecionado.id)
        
        try {
            // 1. Processar pagamento (cria movimentação pendente)
            const resProcessar = await fetch('/api/pagamentos/processar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_entregador: entregadorSelecionado.id,
                    valor: entregadorSelecionado.saldo_disponivel,
                    chave_pix: entregadorSelecionado.chave_pix,
                    observacao
                })
            })
            
            const dataProcessar = await resProcessar.json()
            
            if (!resProcessar.ok) {
                alert(`Erro ao processar: ${dataProcessar.error}`)
                return
            }
            
            // 2. Confirmar pagamento imediatamente (em produção, isso seria após o Pix)
            const resConfirmar = await fetch('/api/pagamentos/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_movimentacao: dataProcessar.id_movimentacao
                })
            })
            
            const dataConfirmar = await resConfirmar.json()
            
            if (!resConfirmar.ok) {
                alert(`Erro ao confirmar: ${dataConfirmar.error}`)
                return
            }
            
            // Sucesso!
            alert(`✅ Pagamento confirmado com sucesso!\n\nValor: ${formatCurrencyBRL(entregadorSelecionado.saldo_disponivel)}\nEntregador: ${entregadorSelecionado.nome}`)
            
            setDialogOpen(false)
            setEntregadorSelecionado(null)
            setObservacao("")
            
            // Recarregar dados
            await carregarDados()
            
        } catch (error) {
            console.error('Erro ao processar pagamento:', error)
            alert('Erro inesperado ao processar pagamento')
        } finally {
            setProcessando(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filtro */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filtrar por:</span>
                <div className="flex gap-2">
                    <Button 
                        variant={filtro === 'todos' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFiltroChange('todos')}
                    >
                        Todos
                    </Button>
                    <Button 
                        variant={filtro === 'entregador' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFiltroChange('entregador')}
                    >
                        Entregadores
                    </Button>
                    <Button 
                        variant={filtro === 'restaurante' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFiltroChange('restaurante')}
                    >
                        Restaurantes
                    </Button>
                </div>
            </div>

            {/* Resumo */}
            {resumo && (
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrencyBRL(resumo.valor_total_geral)}</div>
                            <p className="text-xs text-muted-foreground">{resumo.total} usuários</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">Pagar Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{formatCurrencyBRL(resumo.valor_total_hoje)}</div>
                            <p className="text-xs text-red-600">{resumo.total_hoje} usuários</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">Entregadores</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{formatCurrencyBRL(resumo.valor_entregadores)}</div>
                            <p className="text-xs text-blue-600">{resumo.total_entregadores} entregadores</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-purple-200 bg-purple-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-700">Restaurantes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{formatCurrencyBRL(resumo.valor_restaurantes)}</div>
                            <p className="text-xs text-purple-600">{resumo.total_restaurantes} restaurantes</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-yellow-700">Alertas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-700">{resumo.total_alertas}</div>
                            <p className="text-xs text-yellow-600">requerem atenção</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Pagamentos de Hoje */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-red-600" />
                        <CardTitle>Pagamentos de Hoje ({hoje.length})</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={carregarDados}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </CardHeader>
                <CardContent>
                    {hoje.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-600" />
                            <p>Nenhum pagamento pendente para hoje</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {hoje.map(e => (
                                <div key={e.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{e.nome}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {e.tipo_usuario === 'entregador' ? '🚴 Entregador' : '🍽️ Restaurante'}
                                            </Badge>
                                            {e.status_validacao !== 'OK' && (
                                                <Badge variant="destructive" className="text-xs">
                                                    {e.status_validacao.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {e.descricao_frequencia} • {e.qtd_transacoes} {e.tipo_usuario === 'entregador' ? 'entregas' : 'pedidos'}
                                        </div>
                                        {e.chave_pix && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-muted-foreground">Chave Pix:</span>
                                                <code className="text-xs bg-white px-2 py-1 rounded border">
                                                    {e.chave_pix}
                                                </code>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost"
                                                    className="h-6 px-2"
                                                    onClick={() => copiarChavePix(e.chave_pix!, e.id)}
                                                >
                                                    {copiado === e.id ? (
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right space-y-2 ml-4">
                                        <div className="text-2xl font-bold text-emerald-600">
                                            {formatCurrencyBRL(e.saldo_disponivel)}
                                        </div>
                                        <Button 
                                            size="sm"
                                            disabled={processando === e.id || !e.chave_pix || e.status_validacao === 'SEM_SALDO'}
                                            onClick={() => abrirDialogPagamento(e)}
                                        >
                                            {processando === e.id ? 'Processando...' : 'Pagar Agora'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Alertas */}
            {alertas.length > 0 && (
                <Card className="border-yellow-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <CardTitle>Alertas ({alertas.length})</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {alertas.map(e => (
                                <Alert key={e.id} variant="destructive">
                                    <AlertDescription>
                                        <strong>{e.nome}</strong> - {e.status_validacao.replace('_', ' ')}
                                        {e.status_validacao === 'VALOR_SUSPEITO' && ` (${formatCurrencyBRL(e.saldo_disponivel)})`}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Próximos Pagamentos */}
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Pagamentos ({proximos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {proximos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento programado</p>
                    ) : (
                        <div className="space-y-2">
                            {proximos.slice(0, 10).map(e => (
                                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                    <div>
                                        <div className="font-medium">{e.nome}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Próximo: {new Date(e.proxima_data_pagamento).toLocaleDateString('pt-BR')} • {e.descricao_frequencia}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{formatCurrencyBRL(e.saldo_disponivel)}</div>
                                        <Badge variant="outline" className="text-xs">{e.descricao_frequencia}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de Confirmação */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Pagamento</DialogTitle>
                        <DialogDescription>
                            Você está prestes a processar um pagamento. Verifique os dados antes de confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {entregadorSelecionado && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Entregador:</span>
                                    <p className="font-semibold">{entregadorSelecionado.nome}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Valor:</span>
                                    <p className="font-semibold text-emerald-600 text-lg">
                                        {formatCurrencyBRL(entregadorSelecionado.saldo_disponivel)}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Chave Pix:</span>
                                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                                        {entregadorSelecionado.chave_pix}
                                    </p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm text-muted-foreground">Observação:</label>
                                <Textarea 
                                    value={observacao}
                                    onChange={(e) => setObservacao(e.target.value)}
                                    rows={2}
                                    className="mt-1"
                                />
                            </div>
                            
                            <Alert>
                                <AlertDescription className="text-xs">
                                    ⚠️ Certifique-se de realizar a transferência bancária antes de confirmar.
                                    O sistema registrará o pagamento imediatamente.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={processarPagamento}
                            disabled={processando !== null}
                        >
                            {processando ? 'Processando...' : 'Confirmar Pagamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
