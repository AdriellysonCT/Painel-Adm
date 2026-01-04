"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrencyBRL } from "@/components/format"
import { StatusBadge } from "@/components/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Mov = { id_movimentacao: string | null; id_usuario?: string | null; tipo_usuario?: string | null; tipo?: string | null; origem?: string | null; referencia_id?: string | null; descricao?: string | null; valor?: number | null; status?: string | null; comprovante_url?: string | null; criado_em?: string | null }

export default function RestaurantDetailsDialog({ restauranteId, nome }: { restauranteId: string; nome: string }) {
	const [open, setOpen] = useState(false)
	const [movs, setMovs] = useState<Mov[]>([])
	const [historico, setHistorico] = useState<any[]>([])
	const [falhas, setFalhas] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [statusFilter, setStatusFilter] = useState<string>('todos')
	const [fromDate, setFromDate] = useState<string>('')
	const [toDate, setToDate] = useState<string>('')

	useEffect(() => {
		if (!open) return
		let mounted = true
		setLoading(true)
		;(async () => {
			let query = supabase
				.from('view_extrato_carteira')
				.select('id_movimentacao, id_usuario, tipo_usuario, tipo, origem, referencia_id, descricao, valor, status, comprovante_url, criado_em')
				.eq('tipo_usuario', 'restaurante')
				.eq('id_usuario', restauranteId)

			if (statusFilter !== 'todos') {
				query = query.eq('status', statusFilter)
			}

			if (fromDate) {
				query = query.gte('criado_em', new Date(fromDate).toISOString())
			}
			if (toDate) {
				const end = new Date(toDate)
				end.setHours(23, 59, 59, 999)
				query = query.lte('criado_em', end.toISOString())
			}

			const { data } = await query.order('criado_em', { ascending: false })
			if (mounted) setMovs(((data as any) || []) as Mov[])
			// carregar histórico de repasses
			const hist = await supabase
				.from('historico_repasses')
				.select('id, id_admin, valor, data_repasso, metodo, comprovante_url, observacao')
				.eq('id_restaurante', restauranteId)
				.order('data_repasso', { ascending: false })
				.limit(20)
			if (mounted) setHistorico((hist.data as any) || [])
			// carregar falhas
			const fl = await supabase
				.from('falhas_repasses')
				.select('id, repasse_id, tipo_falha, descricao_erro, status, criado_em')
				.order('criado_em', { ascending: false })
				.limit(20)
			if (mounted) setFalhas((fl.data as any) || [])
			setLoading(false)
		})()
		return () => {
			mounted = false
		}
	}, [open, restauranteId, statusFilter, fromDate, toDate])

    async function marcarComoPago(referenciaId?: string | null, valor?: number | null) {
        if (!referenciaId || !valor) return
        await fetch('/api/repasses/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repasseId: referenciaId, restauranteId, valor, comprovanteUrl: null, observacao: null, adminId: null }),
        })
        setOpen(true)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">Ver Detalhes</Button>
			</DialogTrigger>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Movimentações — {nome}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-3 md:grid-cols-3">
						<div className="rounded-lg border p-3">
							<div className="text-sm text-muted-foreground">Saldo atual</div>
							<div className="text-2xl font-semibold">{formatCurrencyBRL((movs||[]).filter(m=> (m.status||'').toLowerCase()==='confirmado').reduce((acc,m)=>acc+(((m.tipo||'').toLowerCase()==='entrada'?1:-1)*(m.valor||0)),0))}</div>
						</div>
						<div className="rounded-lg border p-3">
							<div className="text-sm text-muted-foreground">Total de entradas</div>
							<div className="text-2xl font-semibold text-emerald-600">{formatCurrencyBRL((movs||[]).filter(m=> (m.tipo||'').toLowerCase()==='entrada' && (m.status||'').toLowerCase()==='confirmado').reduce((acc,m)=>acc+(m.valor||0),0))}</div>
						</div>
						<div className="rounded-lg border p-3">
							<div className="text-sm text-muted-foreground">Total de saídas</div>
							<div className="text-2xl font-semibold text-red-600">{formatCurrencyBRL((movs||[]).filter(m=> (m.tipo||'').toLowerCase()==='saida' && (m.status||'').toLowerCase()==='confirmado').reduce((acc,m)=>acc+(m.valor||0),0))}</div>
						</div>
					</div>

					<div className="grid gap-3 md:grid-cols-4 items-end">
						<div className="grid gap-1">
							<Label>Período (de)</Label>
							<Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
						</div>
						<div className="grid gap-1">
							<Label>Período (até)</Label>
							<Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
						</div>
						<div className="grid gap-1">
							<Label>Status</Label>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
								<SelectContent>
									<SelectItem value="todos">Todos</SelectItem>
									<SelectItem value="confirmado">Confirmado</SelectItem>
									<SelectItem value="pendente">Pendente</SelectItem>
									<SelectItem value="cancelado">Cancelado</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-1">
							<Label>&nbsp;</Label>
							<Button variant="outline" onClick={() => { setFromDate(''); setToDate(''); setStatusFilter('todos') }}>Limpar filtros</Button>
						</div>
					</div>
				</div>

				<Tabs defaultValue="extrato" className="mt-4">
					<TabsList>
						<TabsTrigger value="extrato">Extrato</TabsTrigger>
						<TabsTrigger value="historico">Histórico de repasses</TabsTrigger>
						<TabsTrigger value="falhas">Falhas</TabsTrigger>
					</TabsList>
					<TabsContent value="extrato">
						<ScrollArea className="h-[420px] mt-2">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Descrição</TableHead>
										<TableHead>Valor</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Data</TableHead>
										<TableHead>Origem</TableHead>
										<TableHead>Comprovante</TableHead>
										<TableHead className="text-right">Ações</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(movs || []).map((m) => {
										const tipo = (m.tipo || '').toLowerCase()
										const valorClass = tipo === 'entrada' ? 'text-emerald-600' : tipo === 'saida' ? 'text-red-600' : ''
										const podeMarcarPago = (m.status || '').toLowerCase() !== 'confirmado' && tipo === 'saida'
										return (
											<TableRow key={m.id_movimentacao || Math.random()}>
												<TableCell>{m.descricao || '—'}</TableCell>
												<TableCell className={valorClass}>{formatCurrencyBRL(m.valor || 0)}</TableCell>
												<TableCell>{m.tipo || '—'}</TableCell>
												<TableCell><StatusBadge status={m.status || undefined} /></TableCell>
												<TableCell>{m.criado_em ? new Date(m.criado_em).toLocaleString('pt-BR') : '—'}</TableCell>
												<TableCell>{m.origem || '—'}</TableCell>
												<TableCell>
													{m.comprovante_url ? (
														<a className="text-primary underline" href={m.comprovante_url} target="_blank" rel="noreferrer">Abrir</a>
													) : '—'}
												</TableCell>
												<TableCell className="text-right">
													<Button size="sm" onClick={() => marcarComoPago(m.referencia_id || null, m.valor || null)} disabled={!podeMarcarPago || !m.referencia_id || !m.valor}>Marcar como Pago</Button>
												</TableCell>
											</TableRow>
										)
									})};
								</TableBody>
							</Table>
						</ScrollArea>
					</TabsContent>
					<TabsContent value="historico">
						<ScrollArea className="h-[420px] mt-2">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>ID</TableHead>
										<TableHead>Valor</TableHead>
										<TableHead>Data</TableHead>
										<TableHead>Método</TableHead>
										<TableHead>Comprovante</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(historico || []).map((h) => (
										<TableRow key={h.id}>
											<TableCell>#{h.id}</TableCell>
											<TableCell>{formatCurrencyBRL(h.valor || 0)}</TableCell>
											<TableCell>{h.data_repasso ? new Date(h.data_repasso).toLocaleString('pt-BR') : '—'}</TableCell>
											<TableCell>{h.metodo || '—'}</TableCell>
											<TableCell>{h.comprovante_url ? <a className="text-primary underline" href={h.comprovante_url} target="_blank" rel="noreferrer">Abrir</a> : '—'}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
					</TabsContent>
					<TabsContent value="falhas">
						<ScrollArea className="h-[420px] mt-2">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>ID</TableHead>
										<TableHead>Repasse</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Descrição</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Criado em</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(falhas || []).map((f) => (
										<TableRow key={f.id}>
											<TableCell>#{f.id}</TableCell>
											<TableCell>{f.repasse_id ? `#${f.repasse_id}` : '—'}</TableCell>
											<TableCell>{f.tipo_falha}</TableCell>
											<TableCell className="max-w-[380px] truncate" title={f.descricao_erro}>{f.descricao_erro}</TableCell>
											<TableCell><StatusBadge status={f.status} /></TableCell>
											<TableCell>{f.criado_em ? new Date(f.criado_em).toLocaleString('pt-BR') : '—'}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
					</TabsContent>
				</Tabs>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}


