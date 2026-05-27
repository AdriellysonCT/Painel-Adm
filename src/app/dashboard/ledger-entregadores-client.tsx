"use client"

import { useEffect, useState } from "react"
import { formatCurrencyBRL } from "@/components/format"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ChevronLeft, ChevronRight, TrendingUp, CircleDollarSign, CreditCard, Receipt, Wallet } from "lucide-react"

type EntregaLedger = {
  ledger_id: string
  valor_entrega: number
  id_pedido: string
  criado_em: string
  categoria_contabil: string
  numero_pedido: number
  metodo_pagamento: string
  taxa_entrega: number
  tipo_pagamento: string
  taxa_plataforma: number
}

type EntregadorLedger = {
  entregador_id: string
  nome: string
  qtd_cash: number
  total_cash: number
  qtd_online: number
  total_online: number
  total_taxa_plataforma: number
  qtd_total: number
  total_geral: number
  saldo_online_liquido: number
}

type ExtratoResponse = {
  entregador: { id: string; nome: string }
  resumo: {
    qtd_cash: number; total_cash: number
    qtd_online: number; total_online: number
    total_taxa_plataforma: number
    qtd_total: number; total_geral: number
    saldo_online_liquido: number
  }
  extrato: EntregaLedger[]
  cash_entries: EntregaLedger[]
  online_entries: EntregaLedger[]
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  credito: "Cartão",
  dinheiro: "Dinheiro",
}

const PAYMENT_COLORS: Record<string, string> = {
  pix: "bg-[#f0fdf4] text-[#15803d] border-none",
  credito: "bg-[#eff6ff] text-[#2563eb] border-none",
  dinheiro: "bg-[#fef3c7] text-[#b45309] border-none",
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white border border-[#e2e8f0] rounded-xl shadow-sm ${className}`}>{children}</div>
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 ${color}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">{label}</span>
        <span className="text-inherit opacity-70">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-[#0b1c30] font-mono tracking-tight">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[#64748b]">{sub}</div>}
    </div>
  )
}

export default function LedgerEntregadoresClient() {
  const [entregadores, setEntregadores] = useState<EntregadorLedger[]>([])
  const [totais, setTotais] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedEntregador, setSelectedEntregador] = useState<EntregadorLedger | null>(null)
  const [extratoData, setExtratoData] = useState<ExtratoResponse | null>(null)
  const [loadingExtrato, setLoadingExtrato] = useState(false)
  const [extratoTab, setExtratoTab] = useState<"all" | "cash" | "online">("all")

  useEffect(() => { fetchData() }, [])

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
    } finally { setLoading(false) }
  }

  async function fetchExtrato(entregadorId: string) {
    setLoadingExtrato(true)
    setExtratoTab("all")
    try {
      const res = await fetch(`/api/entregadores/ledger-resumo?entregador_id=${entregadorId}`)
      if (!res.ok) throw new Error('Falha ao carregar extrato')
      const data: ExtratoResponse = await res.json()
      setExtratoData(data)
    } catch (e) {
      console.error('Erro ao buscar extrato:', e)
      setExtratoData(null)
    } finally { setLoadingExtrato(false) }
  }

  const filtered = entregadores.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()))

  const visibleEntries = extratoData?.extrato || []
  const tabEntries = extratoTab === "cash" ? extratoData?.cash_entries || []
    : extratoTab === "online" ? extratoData?.online_entries || []
    : visibleEntries

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-[#2563eb] border-t-transparent rounded-full" />
        </div>
      ) : !selectedEntregador ? (
        <>
          {totais && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Entregas em Dinheiro"
                value={`${totais.qtd_cash}x • ${formatCurrencyBRL(totais.total_cash)}`}
                sub="Entregador recebe direto do cliente — sem taxa da plataforma"
                color="bg-[#fef3c7] border-[#fde68a]"
              />
              <StatCard
                icon={<CreditCard className="h-5 w-5" />}
                label="Entregas Online (Pix/Cartão)"
                value={`${totais.qtd_online}x • ${formatCurrencyBRL(totais.total_online)}`}
                sub={`Taxa plataforma: ${formatCurrencyBRL(totais.total_taxa_plataforma)} (R$1 ou R$2 por entrega)`}
                color="bg-[#e0f2fe] border-[#bae6fd]"
              />
              <StatCard
                icon={<Receipt className="h-5 w-5" />}
                label="Total Taxa Plataforma"
                value={formatCurrencyBRL(totais.total_taxa_plataforma)}
                sub={`Descontado das entregas online`}
                color="bg-white border-[#cbd5e1]"
              />
              <StatCard
                icon={<Wallet className="h-5 w-5" />}
                label="Saldo Líquido Online"
                value={formatCurrencyBRL(totais.saldo_online_liquido)}
                sub={`Total online - taxa plataforma`}
                color="bg-white border-[#2563eb] shadow-[0_0_0_1px_#2563eb]"
              />
            </div>
          )}

          <Card>
            <div className="p-5 border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-bold text-[#0b1c30]">Entregadores</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[#cbd5e1] rounded-lg text-sm w-56" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Entregador</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-right" colSpan={2}>Dinheiro</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-right" colSpan={2}>Online (Pix/Cartão)</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-right">Taxa Plataforma</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-right">Líquido Online</th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[#64748b]">Nenhum entregador encontrado</td></tr>
                  ) : filtered.map((e) => (
                    <tr key={e.entregador_id} className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      onClick={() => { setSelectedEntregador(e); fetchExtrato(e.entregador_id) }}>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#0b1c30]">{e.nome}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Badge className="bg-[#fef3c7] text-[#b45309] border-none font-bold">{e.qtd_cash}x</Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-sm text-[#0b1c30]">{formatCurrencyBRL(e.total_cash)}</td>
                      <td className="px-5 py-4 text-right">
                        <Badge className="bg-[#e0f2fe] text-[#0369a1] border-none font-bold">{e.qtd_online}x</Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-sm text-[#0b1c30]">{formatCurrencyBRL(e.total_online)}</td>
                      <td className="px-5 py-4 text-right font-mono text-sm text-[#b91c1c] font-bold">-{formatCurrencyBRL(e.total_taxa_plataforma)}</td>
                      <td className="px-5 py-4 text-right font-mono text-sm font-bold text-[#059669]">{formatCurrencyBRL(e.saldo_online_liquido)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="material-symbols-outlined text-[#94a3b8] text-[20px]">chevron_right</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
              <span className="text-xs text-[#64748b]">{filtered.length} de {entregadores.length} entregadores</span>
              <div className="flex items-center gap-2">
                <button className="p-1.5 border border-[#cbd5e1] rounded hover:bg-white disabled:opacity-40" disabled><ChevronLeft className="h-4 w-4 text-[#64748b]" /></button>
                <span className="px-3 py-1 bg-[#2563eb] text-white rounded text-xs font-bold">1</span>
                <button className="p-1.5 border border-[#cbd5e1] rounded hover:bg-white"><ChevronRight className="h-4 w-4 text-[#64748b]" /></button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <div className="space-y-5">
          <button onClick={() => { setSelectedEntregador(null); setExtratoData(null) }}
            className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#2563eb] transition-colors">
            <ChevronLeft className="h-4 w-4" /> Voltar para lista
          </button>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0b1c30]">{selectedEntregador.nome}</h3>
                <p className="text-sm text-[#64748b]">Detalhamento de entregas e taxas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#fef3c7] border border-[#fde68a] rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">Dinheiro</p>
                <p className="text-lg font-bold text-[#0b1c30] font-mono">{selectedEntregador.qtd_cash}x entregas</p>
                <p className="text-sm font-mono text-[#b45309] mt-0.5">{formatCurrencyBRL(selectedEntregador.total_cash)}</p>
                <p className="text-[10px] text-[#64748b] mt-1">Sem taxa da plataforma</p>
              </div>
              <div className="bg-[#e0f2fe] border border-[#bae6fd] rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">Online (Pix/Cartão)</p>
                <p className="text-lg font-bold text-[#0b1c30] font-mono">{selectedEntregador.qtd_online}x entregas</p>
                <p className="text-sm font-mono text-[#0369a1] mt-0.5">{formatCurrencyBRL(selectedEntregador.total_online)}</p>
              </div>
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">Taxa Plataforma</p>
                <p className="text-lg font-bold text-[#b91c1c] font-mono">-{formatCurrencyBRL(selectedEntregador.total_taxa_plataforma)}</p>
                <p className="text-[10px] text-[#64748b] mt-1">{selectedEntregador.qtd_online} entregas × R${selectedEntregador.qtd_online > 0 ? (selectedEntregador.total_taxa_plataforma / selectedEntregador.qtd_online).toFixed(0) : "0"}</p>
                <p className="text-[10px] text-[#64748b]">R$1 (taxa &lt; R$5) • R$2 (taxa &ge; R$5)</p>
              </div>
              <div className="bg-white border-2 border-[#059669] rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#059669]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">A Receber (Online)</p>
                <p className="text-lg font-bold text-[#059669] font-mono">{formatCurrencyBRL(selectedEntregador.saldo_online_liquido)}</p>
                <p className="text-[10px] text-[#64748b] mt-1">{formatCurrencyBRL(selectedEntregador.total_online)} - {formatCurrencyBRL(selectedEntregador.total_taxa_plataforma)}</p>
              </div>
            </div>

            <div className="border-t border-[#e2e8f0] pt-6">
              <div className="flex items-center gap-3 mb-4">
                <h4 className="font-bold text-[#0b1c30]">Extrato de Entregas</h4>
                <div className="flex gap-1">
                  {(["all", "cash", "online"] as const).map(tab => (
                    <button key={tab} onClick={() => setExtratoTab(tab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        extratoTab === tab ? "bg-[#2563eb] text-white" : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                      }`}>
                      {tab === "all" ? "Todas" : tab === "cash" ? "Dinheiro" : "Online"}
                    </button>
                  ))}
                </div>
              </div>

              {loadingExtrato ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-[#2563eb] border-t-transparent rounded-full" /></div>
              ) : tabEntries.length === 0 ? (
                <p className="text-sm text-[#64748b] py-4 text-center">Nenhuma entrega nesta categoria.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Data</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Pedido</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Pagamento</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Taxa Entrega</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Taxa Plataforma</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Valor Entregador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {tabEntries.map((l) => (
                        <tr key={l.ledger_id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-[#0b1c30]">
                            {new Date(l.criado_em).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#0b1c30]">#{l.numero_pedido}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${PAYMENT_COLORS[l.metodo_pagamento] || "bg-[#f1f5f9] text-[#64748b] border-none"} text-[11px]`}>
                              {PAYMENT_LABELS[l.metodo_pagamento] || l.metodo_pagamento}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-[#0b1c30]">
                            {formatCurrencyBRL(l.taxa_entrega)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {l.tipo_pagamento === "online" ? (
                              <span className="text-[#b91c1c] font-bold">-{formatCurrencyBRL(l.taxa_plataforma)}</span>
                            ) : <span className="text-[#059669]">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#0b1c30]">
                            {l.tipo_pagamento === "online"
                              ? formatCurrencyBRL(l.valor_entrega - l.taxa_plataforma)
                              : formatCurrencyBRL(l.valor_entrega)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
