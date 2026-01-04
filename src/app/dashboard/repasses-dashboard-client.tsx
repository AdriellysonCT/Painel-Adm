"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyBRL } from "@/components/format"
import { supabase } from "@/lib/supabaseClient"

type Modo = 'restaurante' | 'entregador'

type UsuarioSaldo = {
    id_usuario: string
    nome: string
    saldo_pendente: number
}

type Mov = { criado_em: string | null; descricao: string | null; valor: number | null; status: string | null }

export default function RepassesDashboardClient({ 
    modo: modoExterno, 
    onModoChange,
    onUsuarioClick,
    usuarioSelecionadoId
}: { 
    modo?: Modo; 
    onModoChange?: (modo: Modo) => void;
    onUsuarioClick?: (id: string, nome: string) => void;
    usuarioSelecionadoId?: string;
} = {}) {
    const [modoInterno, setModoInterno] = useState<Modo>('restaurante')
    const modo = modoExterno ?? modoInterno
    
    const setModo = (novoModo: Modo) => {
        setModoInterno(novoModo)
        onModoChange?.(novoModo)
    }
    const [loading, setLoading] = useState(false)
    const [totalPendente, setTotalPendente] = useState(0)
    const [totalPago, setTotalPago] = useState(0)
    const [qtdComSaldo, setQtdComSaldo] = useState(0)
    const [falhas, setFalhas] = useState(0)
    const [usuarios, setUsuarios] = useState<UsuarioSaldo[]>([])
    const [search, setSearch] = useState("")

    // Dialog states
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [selected, setSelected] = useState<UsuarioSaldo | null>(null)
    const [historico, setHistorico] = useState<Mov[]>([])
    const [confirmValor, setConfirmValor] = useState(0)
    const [observacao, setObservacao] = useState("")
    const [confirmLoading, setConfirmLoading] = useState(false)

    useEffect(() => {
        let mounted = true
        ;(async () => {
            setLoading(true)
            if (modo === 'restaurante') {
                // KPIs via repasses_restaurantes - apenas com vendas confirmadas
                const { data: repasses, error: repassesError } = await supabase
                    .from('repasses_restaurantes')
                    .select('id_restaurante, total_vendas_confirmadas, total_repassado, saldo_pendente')
                    .gt('total_vendas_confirmadas', 0)
                
                const rows = (repasses as any[]) || []
                
                // Buscar nomes dos restaurantes separadamente
                const ids = rows.map(r => r.id_restaurante)
                const { data: restaurantesData } = await supabase
                    .from('restaurantes_app')
                    .select('id, nome_fantasia')
                    .in('id', ids)
                
                const nomesMap = new Map<string, string>()
                for (const rest of (restaurantesData as any[]) || []) {
                    nomesMap.set(rest.id, rest.nome_fantasia)
                }
                
                const list: UsuarioSaldo[] = rows.map(r => ({
                    id_usuario: r.id_restaurante,
                    nome: nomesMap.get(r.id_restaurante) || `#${r.id_restaurante}`,
                    saldo_pendente: Number(r.saldo_pendente || 0),
                })).sort((a,b)=> (b.saldo_pendente||0) - (a.saldo_pendente||0))
                const totalPend = rows.reduce((acc, r) => acc + Number(r.saldo_pendente || 0), 0)
                const totalPg = rows.reduce((acc, r) => acc + Number(r.total_repassado || 0), 0)
                const qtd = rows.filter(r => Number(r.saldo_pendente || 0) > 0).length
                const { count } = await supabase.from('falhas_repasses').select('*', { head: true, count: 'exact' }).neq('status', 'resolvido')
                if (!mounted) return
                setUsuarios(list)
                setQtdComSaldo(qtd)
                setTotalPendente(totalPend)
                setTotalPago(totalPg)
                setFalhas(count || 0)
                setLoading(false)
                return
            }

            // Entregadores - buscar todos com movimentações
            const allMovs = await supabase
                .from('view_extrato_carteira')
                .select('id_usuario, valor, status, tipo')
                .eq('tipo_usuario', modo)

            const saldos = new Map<string, number>()
            const allRows = (allMovs.data as any[]) || []
            
            // Calcular saldo: entradas (pendentes + confirmadas) - saídas pagas
            for (const r of allRows) {
                const v = Number(r.valor || 0)
                const tipo = (r.tipo || '').toLowerCase()
                const status = (r.status || '').toLowerCase()
                
                const prev = saldos.get(r.id_usuario) || 0
                
                // Entrada pendente ou confirmada = dinheiro a receber
                if (tipo === 'entrada' && (status === 'pendente' || status === 'confirmado')) {
                    saldos.set(r.id_usuario, prev + v)
                } 
                // Saída paga = dinheiro já repassado
                else if (tipo === 'saida' && status === 'pago') {
                    saldos.set(r.id_usuario, prev - v)
                }
            }
            
            // Filtrar apenas entregadores com saldo > 0 ou que já tiveram movimentações
            const idsComMovimentacao = [...new Set(allRows.map(r => r.id_usuario))]
            const ids = idsComMovimentacao.filter(id => {
                const saldo = saldos.get(id) || 0
                return saldo !== 0 // Mostrar se tem saldo positivo ou negativo (teve atividade)
            })
            
            let nomesMap = new Map<string, string>()
            if (ids.length > 0) {
                const { data: entRows } = await supabase
                    .from('entregadores_app')
                    .select('id, nome')
                    .in('id', ids)
                
                if (entRows && entRows.length > 0) {
                    for (const row of entRows) {
                        if (row.nome) {
                            nomesMap.set(row.id, row.nome)
                        }
                    }
                }
            }
            
            const list: UsuarioSaldo[] = ids.map(id => ({ 
                id_usuario: id, 
                nome: nomesMap.get(id) || `Entregador #${id.substring(0, 8)}`, 
                saldo_pendente: saldos.get(id) || 0 
            })).sort((a,b)=> (b.saldo_pendente||0)-(a.saldo_pendente||0))
            
            // Calcular totais
            // Total pendente = soma de todas as entradas pendentes/confirmadas - saídas pagas
            const totalEntradas = allRows
                .filter(r => (r.tipo || '').toLowerCase() === 'entrada' && 
                           ((r.status || '').toLowerCase() === 'pendente' || (r.status || '').toLowerCase() === 'confirmado'))
                .reduce((acc, r) => acc + Number(r.valor || 0), 0)
            const totalPg = allRows
                .filter(r => (r.status || '').toLowerCase() === 'pago' && (r.tipo || '').toLowerCase() === 'saida')
                .reduce((acc, r) => acc + Number(r.valor || 0), 0)
            const totalPend = totalEntradas - totalPg
            
            if (!mounted) return
            setUsuarios(list)
            setQtdComSaldo(list.filter(u => (u.saldo_pendente || 0) > 0).length)
            setTotalPendente(totalPend)
            setTotalPago(totalPg)
            setFalhas(0)
            setLoading(false)
        })()
        return () => { mounted = false }
    }, [modo])

    const filteredUsuarios = useMemo(() => {
        const s = search.trim().toLowerCase()
        return (usuarios || []).filter(u => u.nome.toLowerCase().includes(s))
    }, [usuarios, search])

    async function openDetails(u: UsuarioSaldo) {
        setSelected(u)
        setDetailsOpen(true)
        const { data } = await supabase
            .from('view_extrato_carteira')
            .select('criado_em, descricao, valor, status')
            .eq('id_usuario', u.id_usuario)
            .eq('tipo_usuario', modo)
            .order('criado_em', { ascending: false })
            .limit(20)
        
        setHistorico(((data as any) || []) as Mov[])
    }

    function openConfirm(u: UsuarioSaldo) {
        setSelected(u)
        setConfirmValor(u.saldo_pendente || 0)
        setObservacao("")
        setConfirmOpen(true)
    }

    async function confirmarPagamento() {
        if (!selected) return
        try {
            setConfirmLoading(true)
            const payload = modo === 'restaurante'
                ? { restauranteId: selected.id_usuario, valor: confirmValor, observacao }
                : { id_usuario: selected.id_usuario, tipo_usuario: modo, valor: confirmValor, admin_id: null, observacao }
            const res = await fetch('/api/repasses/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.message || 'Falha ao confirmar repasse')
            }
            // refresh
            setConfirmOpen(false)
            setSelected(null)
            // Recarregar - força re-fetch dos dados
            window.location.reload()
        } catch (e) {
            console.error(e)
        } finally {
            setConfirmLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Tabs value={modo} onValueChange={(v)=>setModo(v as Modo)}>
                    <TabsList className="grid grid-cols-2 w-[280px]">
                        <TabsTrigger value="restaurante">Restaurantes</TabsTrigger>
                        <TabsTrigger value="entregador">Entregadores</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="text-sm text-muted-foreground">{loading ? 'Carregando…' : 'Atualizado'}</div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-linear-to-br from-emerald-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Total pendente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrencyBRL(totalPendente)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-emerald-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Quantidade com saldo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{qtdComSaldo}</div>
                    </CardContent>
                </Card>
                <Card className="bg-linear-to-br from-emerald-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Total já repassado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{formatCurrencyBRL(totalPago)}</div>
                    </CardContent>
                </Card>
                {modo === 'restaurante' && (
                    <Card className="bg-linear-to-br from-emerald-50 to-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Falhas (não resolvidas)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{falhas}</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Filtro e Tabela */}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
                <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">
                        Buscar por nome 
                        <span className="ml-2 text-emerald-600 font-medium">
                            ({filteredUsuarios.length} {modo === 'restaurante' ? 'restaurantes' : 'entregadores'} com vendas)
                        </span>
                    </label>
                    <Input placeholder={modo === 'restaurante' ? 'Restaurante' : 'Entregador'} value={search} onChange={(e)=>setSearch(e.target.value)} />
                </div>
            </div>
            
            <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md p-2 flex items-center gap-2">
                <span className="text-blue-600">💡</span>
                <span>Clique em uma linha para filtrar o histórico de movimentações</span>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Saldo pendente</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsuarios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    {loading ? (
                                        'Carregando dados...'
                                    ) : search ? (
                                        `Nenhum ${modo === 'restaurante' ? 'restaurante' : 'entregador'} encontrado com "${search}"`
                                    ) : (
                                        `Nenhum ${modo === 'restaurante' ? 'restaurante' : 'entregador'} com vendas confirmadas ainda.`
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsuarios.map(u => {
                                const isSelected = usuarioSelecionadoId === u.id_usuario
                                return (
                                    <TableRow 
                                        key={u.id_usuario}
                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-muted/50'}`}
                                        onClick={() => onUsuarioClick?.(u.id_usuario, u.nome)}
                                    >
                                        <TableCell className="whitespace-nowrap font-medium">{u.nome}</TableCell>
                                        <TableCell className={u.saldo_pendente>0? 'text-red-600 font-medium' : ''}>{formatCurrencyBRL(u.saldo_pendente || 0)}</TableCell>
                                        <TableCell className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="outline" size="sm" onClick={()=>openDetails(u)}>Ver detalhes</Button>
                                            <Button size="sm" disabled={(u.saldo_pendente||0) <= 0} onClick={()=>openConfirm(u)}>Marcar como Pago</Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog Detalhes */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Histórico de {modo === 'restaurante' ? 'Restaurante' : 'Entregador'} {selected?.nome}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-x-auto max-h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(historico || []).map((m, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{m.criado_em ? new Date(m.criado_em).toLocaleString('pt-BR') : '—'}</TableCell>
                                        <TableCell className="whitespace-nowrap max-w-[280px] truncate" title={m.descricao || ''}>{m.descricao || '—'}</TableCell>
                                        <TableCell>{formatCurrencyBRL(m.valor || 0)}</TableCell>
                                        <TableCell>
                                            <Badge variant={m.status === 'pago' ? 'default' : m.status === 'pendente' ? 'destructive' : 'secondary'}>
                                                {m.status || '—'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Confirmar pagamento */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar repasse</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">{selected?.nome}</div>
                        <div className="grid gap-1">
                            <Label>Valor</Label>
                            <Input type="number" step="0.01" value={confirmValor} onChange={(e)=>setConfirmValor(parseFloat(e.target.value || '0'))} />
                        </div>
                        <div className="grid gap-1">
                            <Label>Observação (opcional)</Label>
                            <Input value={observacao} onChange={(e)=>setObservacao(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setConfirmOpen(false)}>Cancelar</Button>
                        <Button onClick={confirmarPagamento} disabled={confirmLoading || confirmValor <= 0}>{confirmLoading ? 'Confirmando…' : 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}


