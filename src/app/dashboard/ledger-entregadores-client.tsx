"use client"

import { useEffect, useState } from "react"
import { formatCurrencyBRL } from "@/components/format"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

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
  const [search, setSearch] = useState("")
  const [selectedEntregador, setSelectedEntregador] = useState<EntregadorLedger | null>(null)
  const [extrato, setExtrato] = useState<LancamentoLedger[]>([])
  const [loadingExtrato, setLoadingExtrato] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/entregadores/ledger-resumo')
      if (!res.ok) throw new Error('Falha ao carregar dados')
      const data = await res.json()
      setEntregadores(data.entregadores || [])
      setTotais(data.totais)
    } catch (e) {
      console.error('Erro ao buscar ledger:', e)
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

  const selected = selectedEntregador

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-[#2563eb] border-t-transparent rounded-full" />
        </div>
      ) : !selectedEntregador ? (
        <>
          {totais && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#e0f2fe] border border-[#bae6fd] p-5 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Total em Dinheiro</span>
                  <span className="text-[#0369a1] material-symbols-outlined">payments</span>
                </div>
                <div className="text-3xl font-bold text-[#0c4a6e] font-mono">{formatCurrencyBRL(totais.total_cash_credito)}</div>
                <div className="mt-2 text-xs text-[#0369a1] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  {totais.qtd_cash_credito} entregas em dinheiro
                </div>
              </div>
              <div className="bg-[#f0fdf4] border border-[#dcfce7] p-5 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Total Digital/Pix</span>
                  <span className="text-[#15803d] material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div className="text-3xl font-bold text-[#064e3b] font-mono">{formatCurrencyBRL(totais.total_digital)}</div>
                <div className="mt-2 text-xs text-[#15803d] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  {totais.qtd_digital} entregas Pix/Cartão
                </div>
              </div>
              <div className="bg-white border border-[#cbd5e1] p-5 rounded-lg shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#2563eb]" />
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Saldo Líquido a Repassar</span>
                  <span className="text-[#2563eb] material-symbols-outlined">account_balance</span>
                </div>
                <div className="text-3xl font-bold text-[#2563eb] font-mono">
                  {formatCurrencyBRL((totais.total_cash_credito || 0) - (totais.total_cash_debito || 0))}
                </div>
                <div className="mt-2 text-xs text-[#64748b]">Valor que o entregador deve repassar ao sistema</div>
              </div>
              <div className="bg-white border border-[#cbd5e1] p-5 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Total de Transações</span>
                  <span className="text-[#64748b] material-symbols-outlined">swap_horiz</span>
                </div>
                <div className="text-3xl font-bold text-[#0b1c30] font-mono">{totais.qtd_cash_credito + totais.qtd_digital}</div>
                <div className="mt-2 text-xs text-[#64748b]">
                  Ticket médio: {formatCurrencyBRL(
                    (totais.total_cash_credito + totais.total_digital) /
                    Math.max(1, totais.qtd_cash_credito + totais.qtd_digital)
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#cbd5e1] rounded-lg shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
              <h4 className="font-semibold text-[#0b1c30]">Entregadores</h4>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
                  <Input
                    placeholder="Buscar entregador..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-[#cbd5e1] rounded-lg text-sm w-64"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Entregador</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#64748b] text-right">Cash Coletado</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#64748b] text-right">Qtd</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#64748b] text-right">Taxa Retida</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#64748b] text-right">Digital</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#64748b] text-right">Saldo a Repassar</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#64748b]">
                        Nenhum entregador encontrado
                      </td>
                    </tr>
                  ) : filtered.map((e) => (
                    <tr
                      key={e.entregador_id}
                      className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEntregador(e)
                        fetchExtrato(e.entregador_id)
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#0b1c30]">{e.nome}</span>
                          {e.chave_pix && (
                            <span className="text-xs text-[#64748b] font-mono">{e.chave_pix}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-[#0b1c30]">{formatCurrencyBRL(e.total_cash_credito)}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge className="bg-[#e0f2fe] text-[#0369a1] border-none">{e.qtd_cash_credito}x</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-[#b91c1c]">{formatCurrencyBRL(e.total_cash_debito)}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-[#0b1c30]">{formatCurrencyBRL(e.total_digital)}</td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${e.saldo_cash_liquido > 0 ? 'text-[#2563eb]' : 'text-[#059669]'}`}>
                        {formatCurrencyBRL(e.saldo_cash_liquido)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="material-symbols-outlined text-[#64748b] text-[20px]">chevron_right</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
              <span className="text-xs text-[#64748b]">
                Exibindo {filtered.length} de {entregadores.length} entregadores
              </span>
              <div className="flex gap-2">
                <button className="p-2 border border-[#cbd5e1] rounded hover:bg-white disabled:opacity-50" disabled>
                  <ChevronLeft className="h-4 w-4 text-[#64748b]" />
                </button>
                <button className="px-3 py-1 bg-[#2563eb] text-white rounded text-xs font-medium">1</button>
                <button className="p-2 border border-[#cbd5e1] rounded hover:bg-white">
                  <ChevronRight className="h-4 w-4 text-[#64748b]" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => { setSelectedEntregador(null); setExtrato([]) }}
            className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#2563eb] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para lista de entregadores
          </button>

          <div className="bg-white border border-[#cbd5e1] rounded-lg p-6">
            <h4 className="text-xl font-bold text-[#0b1c30] mb-1">{selectedEntregador.nome}</h4>
            <p className="text-sm text-[#64748b] mb-6">Extrato detalhado de lançamentos</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#e0f2fe] p-4 rounded-lg">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Cash Coletado</p>
                <p className="text-xl font-bold text-[#0c4a6e] font-mono mt-1">{formatCurrencyBRL(selectedEntregador.total_cash_credito)}</p>
                <p className="text-xs text-[#0369a1]">{selectedEntregador.qtd_cash_credito} entregas</p>
              </div>
              <div className="bg-[#fef2f2] p-4 rounded-lg">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Taxa Retida</p>
                <p className="text-xl font-bold text-[#b91c1c] font-mono mt-1">{formatCurrencyBRL(selectedEntregador.total_cash_debito)}</p>
                <p className="text-xs text-[#b91c1c]">Taxa de entrega retida</p>
              </div>
              <div className="bg-[#f0fdf4] p-4 rounded-lg">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Digital</p>
                <p className="text-xl font-bold text-[#064e3b] font-mono mt-1">{formatCurrencyBRL(selectedEntregador.total_digital)}</p>
                <p className="text-xs text-[#15803d]">{selectedEntregador.qtd_digital} entregas Pix/Cartão</p>
              </div>
              <div className="bg-white border border-[#2563eb] p-4 rounded-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#2563eb]" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Saldo a Repassar</p>
                <p className="text-xl font-bold text-[#2563eb] font-mono mt-1">
                  {formatCurrencyBRL(selectedEntregador.saldo_cash_liquido)}
                </p>
                <p className="text-xs text-[#64748b]">Valor que o entregador deve ao sistema</p>
              </div>
            </div>

            {loadingExtrato ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-[#2563eb] border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Data</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Tipo</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Natureza</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Descrição</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b] text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {extrato.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#64748b]">Nenhum lançamento encontrado.</td>
                      </tr>
                    ) : extrato.map((l) => (
                      <tr key={l.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-[#0b1c30]">
                          {new Date(l.criado_em).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            l.tipo === 'DINHEIRO_FISICO' ? 'bg-[#e0f2fe] text-[#0369a1] border-none' :
                            l.tipo === 'PIX_CARTAO' ? 'bg-[#f0fdf4] text-[#15803d] border-none' :
                            'bg-[#f1f5f9] text-[#64748b] border-none'
                          }>
                            {l.tipo === 'DINHEIRO_FISICO' ? 'Dinheiro' : l.tipo === 'PIX_CARTAO' ? 'Digital' : l.tipo}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={
                            l.natureza?.toUpperCase() === 'CREDITO' ? 'text-[#059669] border-[#059669]' :
                            l.natureza?.toUpperCase() === 'DEBITO' ? 'text-[#b91c1c] border-[#b91c1c]' :
                            'text-[#64748b]'
                          }>
                            {l.natureza || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0b1c30]">{l.categoria_contabil || '—'}</td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${
                          l.natureza?.toUpperCase() === 'CREDITO' ? 'text-[#059669]' :
                          l.natureza?.toUpperCase() === 'DEBITO' ? 'text-[#b91c1c]' : ''
                        }`}>
                          {formatCurrencyBRL(l.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
