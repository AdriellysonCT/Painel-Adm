"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { formatCurrencyBRL } from "@/components/format"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Item = {
    id_entregador: string
    total_entregas: number
    total_recebido: number
    saldo_pendente: number
    nome: string
}

export default function ResumoEntregadoresClient({ items }: { items: Item[] }) {
    const [search, setSearch] = useState("")
    const [sort, setSort] = useState("pendente_desc")
    const [open, setOpen] = useState(false)
    const [valor, setValor] = useState<number>(0)
    const [selecionado, setSelecionado] = useState<Item | null>(null)
    const [loading, setLoading] = useState(false)

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase()
        let arr = (items || []).filter(i => i.nome.toLowerCase().includes(s))
        
        switch (sort) {
            case "pendente_desc":
                arr = arr.sort((a,b)=> (b.saldo_pendente||0) - (a.saldo_pendente||0)); break
            case "recebido_desc":
                arr = arr.sort((a,b)=> (b.total_recebido||0) - (a.total_recebido||0)); break
            case "entregas_desc":
                arr = arr.sort((a,b)=> (b.total_entregas||0) - (a.total_entregas||0)); break
        }
        return arr
    }, [items, search, sort])

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">{filtered.length} entregadores</div>
                <div className="flex gap-2">
                    <Input placeholder="Buscar entregador" value={search} onChange={(e)=>setSearch(e.target.value)} className="w-[220px]" />
                    <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pendente_desc">Saldo pendente (desc)</SelectItem>
                            <SelectItem value="recebido_desc">Total recebido (desc)</SelectItem>
                            <SelectItem value="entregas_desc">Total entregas (desc)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((e) => {
                    const total = e.total_entregas || 0
                    const recebido = e.total_recebido || 0
                    const progress = total > 0 ? Math.min(100, Math.round((recebido/total)*100)) : 0
                    const saldo = e.saldo_pendente || 0
                    return (
                        <Card key={e.id_entregador} className="border-emerald-100 bg-white/70 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold truncate">{e.nome}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">Total Entregas</span>
                                        <span className="font-semibold text-sm">{formatCurrencyBRL(total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">Recebido</span>
                                        <span className="font-semibold text-sm">{formatCurrencyBRL(recebido)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">Pendente</span>
                                        <span className={`font-semibold text-sm ${saldo>0?'text-red-600':'text-emerald-700'}`}>{formatCurrencyBRL(saldo)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t overflow-hidden">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Progresso</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="overflow-hidden">
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <Button size="sm" className="w-full" disabled={(saldo||0) <= 0} onClick={()=>{ setSelecionado(e); setValor(saldo||0); setOpen(true) }}>
                                        Marcar como Pago
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar repasse</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{selecionado?.nome}</div>
                        <div className="grid gap-1">
                            <label className="text-xs text-muted-foreground">Valor</label>
                            <Input type="number" step="0.01" value={valor} onChange={(e)=>setValor(parseFloat(e.target.value || '0'))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
                        <Button disabled={loading || valor<=0} onClick={async ()=>{
                            if (!selecionado) return
                            setLoading(true)
                            try {
                                const res = await fetch('/api/repasses/confirmar', { 
                                    method: 'POST', 
                                    headers: { 'Content-Type': 'application/json' }, 
                                    body: JSON.stringify({ 
                                        id_usuario: selecionado.id_entregador, 
                                        tipo_usuario: 'entregador',
                                        valor 
                                    }) 
                                })
                                if (!res.ok) {
                                    const data = await res.json().catch(()=>({}))
                                    throw new Error(data?.message || 'Falha ao confirmar')
                                }
                                setOpen(false)
                                location.reload()
                            } catch (e) {
                                console.error(e)
                            } finally {
                                setLoading(false)
                            }
                        }}>{loading? 'Confirmando…' : 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
