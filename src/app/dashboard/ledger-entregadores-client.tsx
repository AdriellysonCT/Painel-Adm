"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrencyBRL } from "@/components/format"
import { Banknote, CreditCard, TrendingDown, AlertCircle, Loader2, Search, ArrowUpDown, ChevronRight, DollarSign, Wallet } from "lucide-react"

type LancamentoLedger = {
  id: string
  tipo: string
  natureza: string | null
  valor: number
  categoria_contabil: string | null
  referencia_externa: string | null
  criado_em: string
  status: string
  conta_recebedora_id: string
}

type EntregadorLedger = {
  entregador_id: string
  nome: string
  chave_pix: string | null
  total_cash_credito: number
  total_cash_debito: number
  total_digital: number
  total_geral: number
  qtd_cash_credito: number
  qtd_cash_total: number
  qtd_digital: number
  qtd_entregas: number
  saldo_cash_liquido: number
}

type ExtratoResponse = {
  entregador: { id: string; nome: string }
  resumo: {
    total_cash_credito: number
    total_cash_debito: number
    total_digital: number
    total_geral: number
    qtd_cash_credito: number
    qtd_cash_total: number
    qtd_digital: number
    qtd_entregas: number
  }
  saldo_cash_liquido: number
  extrato: LancamentoLedger[]
}

export default function LedgerEntregadoresClient() {
  const [entregadores, setEntregadores] = useState<EntregadorLedger[]>([])
  const [totais, setTotais] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("nome")
  const [selectedEntregador, setSelectedEntregador] = useState<EntregadorLedger | null>(null)
  const [extrato, setExtrato] = useState<LancamentoLedger[]>([])
  const [loadingExtrato, setLoadingExtrato] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/entregadores/ledger-resumo')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Falha ao carregar dados')
      }
      const data = await res.json()
      setEntregadores(data.entregadores || [])
      setTotais(data.totais)
    } catch (e) {
      console.error('Erro ao buscar ledger:', e)
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function fetchExtrato(entregadorId: string) {
    setLoadingExtrato(true)
    try {
      const res = await fetch(`/api/entregadores/ledger-resumo?entregador_id=${entregadorId}`)
      if (!res.ok) throw new Error('Falha ao carregar extrato')
      const data: ExtratoResponse = await res.json()
      setExtrato(data.extrato || [])
    } catch (e) {
      console.error('Erro ao buscar extrato:', e)
      setExtrato([])
    } finally {
      setLoadingExtrato(false)
    }
  }

  const filtered = entregadores
    .filter(e => e.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sort) {
        case "nome": return a.nome.localeCompare(b.nome)
        case "cash_desc": return b.total_cash_credito - a.total_cash_credito
        case "digital_desc": return b.total_digital - a.total_digital
        case "saldo_desc": return b.saldo_cash_liquido - a.saldo_cash_liquido
        default: return 0
      }
    })

  function getTipoBadge(tipo: string) {
    switch (tipo.toUpperCase()) {
      case 'DINHEIRO_FISICO': return <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1"><Banknote className="size-3" /> Dinheiro</Badge>
      case 'PIX_CARTAO': return <Badge className="bg-blue-100 text-blue-800 border-blue-300 gap-1"><CreditCard className="size-3" /> Pix/Cartão</Badge>
      case 'ENTREGA': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1"><Wallet className="size-3" /> Entrega</Badge>
      default: return <Badge variant="outline">{tipo}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="size-6 text-amber-500" />
            Ledger — Cash vs Digital
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento de entregas em dinheiro vs Pix/cartão por entregador.
            Entregas em dinheiro são coletadas diretamente pelo entregador — o saldo líquido
            representa o valor que ele deve repassar ao sistema (total coletado - taxa de entrega).
          </p>
        </div>
        <button onClick={fetchData} disabled={loading} className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50">
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Summary Cards */}
      {totais && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <Banknote className="size-4" />
                Total Cash Coletado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-900">{formatCurrencyBRL(totais.total_cash_credito)}</p>
              <p className="text-xs text-amber-700">{totais.qtd_cash_credito} entregas em dinheiro</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <CreditCard className="size-4" />
                Total Digital (Pix/Cartão)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-900">{formatCurrencyBRL(totais.total_digital)}</p>
              <p className="text-xs text-blue-700">{totais.qtd_digital} entregas Pix/Cartão</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <TrendingDown className="size-4" />
                Taxa de Entrega (retida)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-900">{formatCurrencyBRL(totais.total_cash_debito)}</p>
              <p className="text-xs text-red-700">Taxa retida pelo entregador nas entregas cash</p>
            </CardContent>
          </Card>
          <Card className={((totais.total_cash_credito - totais.total_cash_debito) > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="size-4" />
                Saldo a Repassar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${(totais.total_cash_credito - totais.total_cash_debito) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrencyBRL(totais.total_cash_credito - totais.total_cash_debito)}
              </p>
              <p className="text-xs text-muted-foreground">Valor que o entregador deve repassar ao sistema</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filtered.length} de {entregadores.length} entregadores
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar entregador"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-[220px] pl-8"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[200px]">
              <ArrowUpDown className="size-3 mr-1" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="cash_desc">Total Cash (desc)</SelectItem>
              <SelectItem value="digital_desc">Total Digital (desc)</SelectItem>
              <SelectItem value="saldo_desc">Saldo Líquido (desc)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="size-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Erro ao carregar dados</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entregador</TableHead>
                <TableHead className="text-right">Cash Coletado</TableHead>
                <TableHead className="text-right">Qtd Cash</TableHead>
                <TableHead className="text-right">Taxa Retida</TableHead>
                <TableHead className="text-right">Digital</TableHead>
                <TableHead className="text-right">Qtd Digital</TableHead>
                <TableHead className="text-right">Saldo a Repassar</TableHead>
                <TableHead className="text-right">Chave Pix</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum entregador encontrado
                  </TableCell>
                </TableRow>
              ) : filtered.map((e) => (
                <TableRow
                  key={e.entregador_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedEntregador(e)
                    fetchExtrato(e.entregador_id)
                    setDialogOpen(true)
                  }}
                >
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrencyBRL(e.total_cash_credito)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">{e.qtd_cash_credito}x</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">{formatCurrencyBRL(e.total_cash_debito)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrencyBRL(e.total_digital)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">{e.qtd_digital}x</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${e.saldo_cash_liquido > 0 ? 'text-amber-600' : e.saldo_cash_liquido < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrencyBRL(e.saldo_cash_liquido)}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.chave_pix ? (
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px] inline-block align-middle">{e.chave_pix}</span>
                    ) : (
                      <Badge variant="outline" className="text-red-500 border-red-300 text-[10px]">Sem chave</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Extrato detalhado */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setExtrato([])
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="size-5 text-amber-500" />
              Extrato Ledger — {selectedEntregador?.nome}
            </DialogTitle>
          </DialogHeader>

          {loadingExtrato ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mini resumo */}
              {selectedEntregador && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <p className="text-[10px] font-bold text-amber-800 uppercase">Cash Coletado</p>
                    <p className="text-lg font-bold text-amber-900">{formatCurrencyBRL(selectedEntregador.total_cash_credito)}</p>
                    <p className="text-xs text-amber-700">{selectedEntregador.qtd_cash_credito} entregas</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-[10px] font-bold text-red-800 uppercase">Taxa Retida</p>
                    <p className="text-lg font-bold text-red-900">{formatCurrencyBRL(selectedEntregador.total_cash_debito)}</p>
                    <p className="text-xs text-red-700">Taxa de entrega que o entregador reteve</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-[10px] font-bold text-blue-800 uppercase">Digital</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrencyBRL(selectedEntregador.total_digital)}</p>
                    <p className="text-xs text-blue-700">{selectedEntregador.qtd_digital} entregas Pix/Cartão</p>
                  </div>
                  <div className={selectedEntregador.saldo_cash_liquido > 0 ? 'bg-amber-100 p-3 rounded-lg' : 'bg-emerald-100 p-3 rounded-lg'}>
                    <p className="text-[10px] font-bold uppercase">Saldo a Repassar</p>
                    <p className={`text-lg font-bold ${selectedEntregador.saldo_cash_liquido > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {formatCurrencyBRL(selectedEntregador.saldo_cash_liquido)}
                    </p>
                    <p className="text-xs text-muted-foreground">Valor que o entregador deve ao sistema</p>
                  </div>
                </div>
              )}

              {/* Tabela de lançamentos */}
              {extrato.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhum lançamento encontrado no ledger.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extrato.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {new Date(l.criado_em).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{getTipoBadge(l.tipo)}</TableCell>
                        <TableCell>
                          {l.natureza?.toUpperCase() === 'CREDITO' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Crédito</Badge>
                          ) : l.natureza?.toUpperCase() === 'DEBITO' ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Débito</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{l.categoria_contabil || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{l.referencia_externa ? l.referencia_externa.substring(0, 12) + '...' : '—'}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${(l.natureza || '').toUpperCase() === 'CREDITO' ? 'text-emerald-600' : (l.natureza || '').toUpperCase() === 'DEBITO' ? 'text-red-600' : ''}`}>
                          {formatCurrencyBRL(l.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
