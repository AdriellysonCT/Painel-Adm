"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { formatCurrencyBRL } from "@/components/format"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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

export default function HistoricoTabsClient({ 
    restaurantes: restaurantesIniciais, 
    entregadores: entregadoresIniciais,
    modo: modoExterno 
}: { 
    restaurantes?: HistoricoItem[]; 
    entregadores?: HistoricoItem[];
    modo?: 'restaurante' | 'entregador'
}) {
    const [status, setStatus] = useState<string>('todos')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')
    const [density, setDensity] = useState<'default' | 'compact'>('default')
    const [showValor, setShowValor] = useState(true)
    const [showData, setShowData] = useState(true)
    const [showStatus, setShowStatus] = useState(true)
    
    // Se modo externo for passado, mostrar apenas esse tipo
    const restaurantes = restaurantesIniciais || []
    const entregadores = entregadoresIniciais || []
    const modoUnico = modoExterno

    function filterItems(items: HistoricoItem[]) {
        return (items || []).filter(i => {
            if (status !== 'todos' && (i.status || '').toLowerCase() !== status) return false
            if (fromDate) {
                const v = i.criado_em ? new Date(i.criado_em).toISOString() : ''
                if (v < new Date(fromDate).toISOString()) return false
            }
            if (toDate) {
                const end = new Date(toDate); end.setHours(23,59,59,999)
                const v = i.criado_em ? new Date(i.criado_em).toISOString() : ''
                if (v > end.toISOString()) return false
            }
            return true
        })
    }

    function exportCsv(items: HistoricoItem[]) {
        const header = ['id_movimentacao','entidade','tipo_pedido','valor','data','status']
        const rows = items.map(i => [
            i.id_movimentacao, 
            i.restaurantes_app?.nome_fantasia || `#${i.id_usuario}`, 
            i.tipo_pedido || '—',
            (i.valor||0).toString().replace('.',','), 
            i.criado_em || '', 
            i.status || ''
        ])
        const csv = [header.join(';'), ...rows.map(r=>r.join(';'))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'historico.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const items = modoUnico === 'restaurante' ? restaurantes : modoUnico === 'entregador' ? entregadores : []
    const showTabs = !modoUnico

    return (
        <div className="w-full">
            {showTabs && (
                <Tabs defaultValue="restaurantes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="restaurantes">Restaurantes</TabsTrigger>
                        <TabsTrigger value="entregadores">Entregadores</TabsTrigger>
                    </TabsList>

            <div className="sticky top-0 z-10 bg-card/60 backdrop-blur supports-backdrop-filter:bg-card/60 rounded-md border px-3 py-3 my-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">Status</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="confirmado">Confirmado</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">De</label>
                        <Input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">Até</label>
                        <Input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">Densidade</label>
                        <Select value={density} onValueChange={(v)=>setDensity(v as any)}>
                            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Densidade" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Padrão</SelectItem>
                                <SelectItem value="compact">Compacta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button variant="outline" onClick={() => { setStatus('todos'); setFromDate(''); setToDate('') }}>Limpar</Button>
                        <Button variant="outline" onClick={() => exportCsv([...filterItems(restaurantes), ...filterItems(entregadores)])}>Exportar CSV</Button>
                    </div>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showValor} onChange={(e)=>setShowValor(e.target.checked)} /> Valor</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showData} onChange={(e)=>setShowData(e.target.checked)} /> Data</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showStatus} onChange={(e)=>setShowStatus(e.target.checked)} /> Status</label>
                </div>
            </div>

                    {/* Restaurantes */}
                    <TabsContent value="restaurantes">
                        <HistoricoTable items={filterItems(restaurantes)} density={density} showValor={showValor} showData={showData} showStatus={showStatus} modo="restaurante" />
                    </TabsContent>
                    <TabsContent value="entregadores">
                        <HistoricoTable items={filterItems(entregadores)} density={density} showValor={showValor} showData={showData} showStatus={showStatus} modo="entregador" />
                    </TabsContent>
                </Tabs>
            )}
            
            {!showTabs && (
                <HistoricoTable items={filterItems(items)} density={density} showValor={showValor} showData={showData} showStatus={showStatus} modo={modoUnico} />
            )}
        </div>
    )
}

function HistoricoTable({ items, density, showValor, showData, showStatus, modo }: { items: HistoricoItem[], density: 'default'|'compact', showValor: boolean, showData: boolean, showStatus: boolean, modo?: 'restaurante' | 'entregador' }) {
    const isRestaurante = modo === 'restaurante'
    
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID Mov.</TableHead>
                        <TableHead>Entidade</TableHead>
                        {isRestaurante && <TableHead>Tipo</TableHead>}
                        {showValor && <TableHead>Valor</TableHead>}
                        {showData && <TableHead>Data</TableHead>}
                        {showStatus && <TableHead>Status</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(items || []).map((h) => (
                        <TableRow key={h.id_movimentacao || Math.random()} className={density==='compact' ? 'text-sm' : ''}>
                            <TableCell>#{h.id_movimentacao || '—'}</TableCell>
                            <TableCell>{h.restaurantes_app?.nome_fantasia || `#${h.id_usuario}`}</TableCell>
                            {isRestaurante && <TableCell className="capitalize">{h.tipo_pedido || '—'}</TableCell>}
                            {showValor && <TableCell>{formatCurrencyBRL(h.valor || 0)}</TableCell>}
                            {showData && <TableCell>{h.criado_em ? new Date(h.criado_em).toLocaleDateString('pt-BR') : '—'}</TableCell>}
                            {showStatus && <TableCell><StatusBadge status={h.status || undefined} /></TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}


