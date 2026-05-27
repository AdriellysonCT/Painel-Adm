"use client"

import { useEffect, useState } from "react"
import { formatCurrencyBRL } from "@/components/format"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ChevronLeft, ChevronRight, CircleDollarSign, CreditCard, Receipt, Wallet, Info, Calculator } from "lucide-react"

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
  valor_total_pedido?: number
  valor_item?: number
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
  credito: "Cartão de Crédito",
  dinheiro: "Dinheiro",
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export default function LedgerEntregadoresClient() {
  const [entregadores, setEntregadores] = useState<EntregadorLedger[]>([])
  const [totais, setTotais] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedEntregador, setSelectedEntregador] = useState<EntregadorLedger | null>(null)
  const [extratoData, setExtratoData] = useState<ExtratoResponse | null>(null)
  const [loadingExtrato, setLoadingExtrato] = useState(false)
  const [extratoTab, setExtratoTab] = useState<"cash" | "online">("cash")

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/entregadores/ledger-resumo")
      if (!res.ok) throw new Error("Falha ao carregar dados")
      const data = await res.json()
      setEntregadores(data.entregadores || [])
      setTotais(data.totais)
    } catch (e) {
      console.error("Erro ao buscar ledger:", e)
    } finally { setLoading(false) }
  }

  async function fetchExtrato(entregadorId: string) {
    setLoadingExtrato(true)
    setExtratoTab("cash")
    try {
      const res = await fetch(`/api/entregadores/ledger-resumo?entregador_id=${entregadorId}`)
      if (!res.ok) throw new Error("Falha ao carregar extrato")
      const data: ExtratoResponse = await res.json()
      setExtratoData(data)
    } catch (e) {
      console.error("Erro ao buscar extrato:", e)
      setExtratoData(null)
    } finally { setLoadingExtrato(false) }
  }

  const filtered = entregadores.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-[#2563eb] border-t-transparent rounded-full" /></div>
      ) : !selectedEntregador ? (
        <>
          {totais && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-[#fde68a] bg-[#fef3c7] p-5">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">Entregas em Dinheiro</span>
                  <CircleDollarSign className="h-5 w-5 text-[#b45309]" />
                </div>
                <div className="text-xl font-bold text-[#0b1c30] font-mono">{totais.qtd_cash}x entregas</div>
                <div className="text-lg font-mono text-[#b45309] font-bold">{formatCurrencyBRL(totais.total_cash)}</div>
                <div className="mt-1.5 text-[11px] text-[#64748b]">Entregador coletou do cliente. <strong>Taxa da plataforma se aplica</strong> (R$1 ou R$2).</div>
              </div>
              <div className="rounded-xl border border-[#bae6fd] bg-[#e0f2fe] p-5">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">Entregas Online (Pix/Cartão)</span>
                  <CreditCard className="h-5 w-5 text-[#0369a1]" />
                </div>
                <div className="text-xl font-bold text-[#0b1c30] font-mono">{totais.qtd_online}x entregas</div>
                <div className="text-lg font-mono text-[#0369a1] font-bold">{formatCurrencyBRL(totais.total_online)}</div>
                <div className="mt-1.5 text-[11px] text-[#64748b]">Split no pagamento — <strong>sem taxa para o entregador</strong>. Plataforma já reteve o valor.</div>
              </div>
              <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-5">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">Total Taxa Plataforma</span>
                  <Receipt className="h-5 w-5 text-[#b91c1c]" />
                </div>
                <div className="text-2xl font-bold text-[#b91c1c] font-mono">{formatCurrencyBRL(totais.total_taxa_plataforma)}</div>
                <div className="mt-1.5 text-[11px] text-[#64748b]">Taxa a receber da <strong>entrega em dinheiro</strong> (entregador deve à plataforma).</div>
              </div>
              <div className="rounded-xl border-2 border-[#059669] bg-white p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#059669]" />
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">A Repassar ao Entregador</span>
                  <Wallet className="h-5 w-5 text-[#059669]" />
                </div>
                <div className="text-2xl font-bold text-[#059669] font-mono">{formatCurrencyBRL(totais.saldo_online_liquido)}</div>
                <div className="mt-1.5 text-[11px] text-[#64748b]">{formatCurrencyBRL(totais.total_online)} (online) - {formatCurrencyBRL(totais.total_taxa_plataforma)} (taxa dinheiro) = <strong>{formatCurrencyBRL(totais.saldo_online_liquido)}</strong></div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] p-5">
              <h4 className="font-bold text-[#0b1c30]">Entregadores</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-56 border border-[#cbd5e1] rounded-lg pl-10 pr-4 py-2 text-sm" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Entregador</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-right">Dinheiro</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] text-right">Online</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#b91c1c] text-right">(-) Taxa Plataforma</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#059669] text-right">(=) Líquido a Repassar</th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#64748b]">Nenhum entregador encontrado</td></tr>
                  ) : filtered.map((e) => (
                    <tr key={e.entregador_id} className="cursor-pointer transition-colors hover:bg-[#f8fafc]"
                      onClick={() => { setSelectedEntregador(e); fetchExtrato(e.entregador_id) }}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#0b1c30]">{e.nome}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-[#fef3c7] px-2 py-0.5 text-[11px] font-bold text-[#b45309]">
                          {e.qtd_cash}x <span className="font-mono">{formatCurrencyBRL(e.total_cash)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-[#e0f2fe] px-2 py-0.5 text-[11px] font-bold text-[#0369a1]">
                          {e.qtd_online}x <span className="font-mono">{formatCurrencyBRL(e.total_online)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-sm font-bold text-[#b91c1c]">{formatCurrencyBRL(e.total_taxa_plataforma)}</td>
                      <td className="px-5 py-4 text-right font-mono text-sm font-bold text-[#059669]">{formatCurrencyBRL(e.saldo_online_liquido)}</td>
                      <td className="px-5 py-4 text-right"><span className="material-symbols-outlined text-[#94a3b8] text-[20px]">chevron_right</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <span className="text-xs text-[#64748b]">{filtered.length} de {entregadores.length} entregadores</span>
              <div className="flex items-center gap-2">
                <button className="rounded border border-[#cbd5e1] p-1.5 hover:bg-white disabled:opacity-40" disabled><ChevronLeft className="h-4 w-4 text-[#64748b]" /></button>
                <span className="rounded bg-[#2563eb] px-3 py-1 text-xs font-bold text-white">1</span>
                <button className="rounded border border-[#cbd5e1] p-1.5 hover:bg-white"><ChevronRight className="h-4 w-4 text-[#64748b]" /></button>
              </div>
            </div>
          </div>
        </>
      ) : extratoData && (
        <div className="space-y-5">
          <button onClick={() => { setSelectedEntregador(null); setExtratoData(null) }}
            className="flex items-center gap-2 text-sm text-[#64748b] transition-colors hover:text-[#2563eb]">
            <ChevronLeft className="h-4 w-4" /> Voltar para lista
          </button>

          <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#0b1c30]">{extratoData.entregador.nome}</h3>
                <p className="text-sm text-[#64748b]">Resumo financeiro completo</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#fde68a] bg-[#fef3c7] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Dinheiro</p>
                <p className="mt-0.5 text-lg font-bold text-[#0b1c30] font-mono">{extratoData.resumo.qtd_cash}x entregas</p>
                <p className="font-mono text-sm text-[#b45309]">{formatCurrencyBRL(extratoData.resumo.total_cash)}</p>
                <p className="mt-1 text-[10px] text-[#64748b]">Taxa se aplica</p>
              </div>
              <div className="rounded-xl border border-[#bae6fd] bg-[#e0f2fe] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Online (Pix/Cartão)</p>
                <p className="mt-0.5 text-lg font-bold text-[#0b1c30] font-mono">{extratoData.resumo.qtd_online}x entregas</p>
                <p className="font-mono text-sm text-[#0369a1]">{formatCurrencyBRL(extratoData.resumo.total_online)}</p>
                <p className="mt-1 text-[10px] text-[#64748b]">Sem taxa</p>
              </div>
              <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Taxa Plataforma</p>
                <p className="mt-0.5 text-lg font-bold text-[#b91c1c] font-mono">{formatCurrencyBRL(extratoData.resumo.total_taxa_plataforma)}</p>
                <p className="mt-1 text-[10px] text-[#64748b]">
                  {extratoData.resumo.total_taxa_plataforma > 0
                    ? `R$ ${(extratoData.resumo.total_taxa_plataforma / Math.max(extratoData.resumo.qtd_cash, 1)).toFixed(0)} por entrega em dinheiro`
                    : "Nenhuma taxa"}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-xl border-2 border-[#059669] bg-white p-4">
                <div className="absolute left-0 top-0 h-full w-1 bg-[#059669]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">A Repassar</p>
                <p className="mt-0.5 text-lg font-bold text-[#059669] font-mono">{formatCurrencyBRL(extratoData.resumo.saldo_online_liquido)}</p>
                <p className="mt-1 text-[10px] text-[#64748b]">{formatCurrencyBRL(extratoData.resumo.total_online)} - {formatCurrencyBRL(extratoData.resumo.total_taxa_plataforma)}</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {(["cash", "online"] as const).map(tab => (
                  <button key={tab} onClick={() => setExtratoTab(tab)}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      extratoTab === tab
                        ? tab === "cash" ? "bg-[#b45309] text-white" : "bg-[#0369a1] text-white"
                        : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                    }`}>
                    {tab === "cash" ? `Dinheiro (${extratoData.cash_entries.length})` : `Online (${extratoData.online_entries.length})`}
                  </button>
                ))}
              </div>
            </div>

            {loadingExtrato ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-[#2563eb] border-t-transparent rounded-full" /></div>
            ) : (
              <>
                {extratoTab === "cash" ? (
                  extratoData.cash_entries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#64748b]">Nenhuma entrega em dinheiro.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#fde68a] bg-[#fef3c7] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#b45309]" />
                          <div>
                            <p className="text-sm font-bold text-[#b45309]">Taxa da Plataforma — Entregas em Dinheiro</p>
                            <p className="mt-1 text-[13px] text-[#64748b] leading-relaxed">
                              O entregador recebeu o dinheiro diretamente do cliente. Por isso, a plataforma cobra uma taxa sobre essas entregas:
                            </p>
                            <ul className="mt-1.5 space-y-0.5 text-[13px] text-[#64748b]">
                              <li className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[11px] font-bold text-[#b45309]">R$1</span>
                                Quando a <strong>taxa de entrega</strong> for <strong>menor que R$5,00</strong>
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fef2f2] text-[11px] font-bold text-[#b91c1c]">R$2</span>
                                Quando a <strong>taxa de entrega</strong> for <strong>igual ou maior que R$5,00</strong>
                              </li>
                            </ul>
                            <p className="mt-1.5 text-[13px] text-[#64748b] leading-relaxed">
                              O valor a pagar refere-se ao acerto que o entregador deve fazer com a plataforma.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                        <div className="border-b border-[#fde68a] bg-[#fef3c7] px-5 py-3">
                          <div className="flex items-center gap-2">
                            <CircleDollarSign className="h-4 w-4 text-[#b45309]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#b45309]">Entregas em Dinheiro</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#64748b]">
                            Entregador coletou o valor total do cliente. Deve acertar a taxa da plataforma por cada entrega.
                          </p>
                        </div>
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-[#e2e8f0] bg-[#fafafa]">
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Data</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Pedido</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total Pedido</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Valor Item</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Taxa Entrega</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#b91c1c] text-right">(-) Taxa Plataforma</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#059669] text-right">Valor Líquido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {extratoData.cash_entries.map(l => (
                              <tr key={l.ledger_id} className="transition-colors hover:bg-[#fffbeb]">
                                <td className="px-4 py-3 font-mono text-xs text-[#0b1c30]">{formatDate(l.criado_em)}</td>
                                <td className="px-4 py-3 text-sm text-[#0b1c30]">#{l.numero_pedido}</td>
                                <td className="px-4 py-3 font-mono text-xs text-[#64748b]">{l.valor_total_pedido ? formatCurrencyBRL(l.valor_total_pedido) : "-"}</td>
                                <td className="px-4 py-3 text-right font-mono text-sm text-[#64748b]">{l.valor_item ? formatCurrencyBRL(l.valor_item) : "-"}</td>
                                <td className="px-4 py-3 text-right font-mono text-sm text-[#0b1c30]">{formatCurrencyBRL(l.taxa_entrega)}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1 rounded-md bg-[#fef2f2] px-2 py-0.5 text-[11px] font-bold text-[#b91c1c]">
                                    -{formatCurrencyBRL(l.taxa_plataforma)}
                                    <span className="text-[10px] text-[#64748b] font-normal">
                                      (R${l.taxa_entrega >= 5 ? "2" : "1"} — {l.taxa_entrega >= 5 ? "≥ R$5" : "< R$5"})
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#059669]">
                                  +{formatCurrencyBRL(l.valor_entrega - l.taxa_plataforma)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-[#fde68a] bg-[#fffbeb]">
                              <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-[#0b1c30]">Total Dinheiro:</td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#b91c1c]">-{formatCurrencyBRL(extratoData.resumo.total_taxa_plataforma)}</td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#b45309]">
                                {formatCurrencyBRL(extratoData.resumo.total_cash - extratoData.resumo.total_taxa_plataforma)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )
                ) : (
                  extratoData.online_entries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#64748b]">Nenhuma entrega online.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#bae6fd] bg-[#f0f9ff] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0369a1]" />
                          <div>
                            <p className="text-sm font-bold text-[#0369a1]">Entregas Online — Sem Taxa</p>
                            <p className="mt-1 text-[13px] text-[#64748b] leading-relaxed">
                              Em pagamentos online (Pix/Cartão), o split já ocorre na hora do pagamento entre restaurante e plataforma. 
                              O valor da entrega do entregador já fica retido na plataforma — <strong>não há taxa a descontar</strong>.
                            </p>
                            <p className="mt-1 text-[13px] text-[#64748b] leading-relaxed">
                              A plataforma repassa o valor <strong>integral</strong> da taxa de entrega ao entregador.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                        <div className="border-b border-[#bae6fd] bg-[#e0f2fe] px-5 py-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-[#0369a1]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0369a1]">Entregas Online (Pix/Cartão)</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#64748b]">
                            Sem taxa da plataforma. O entregador recebe o valor integral da taxa de entrega.
                          </p>
                        </div>
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-[#e2e8f0] bg-[#fafafa]">
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Data</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Pedido</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total Pedido</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Valor Item</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Pagamento</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#64748b] text-right">Taxa Entrega</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#059669] text-right">Valor a Receber</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {extratoData.online_entries.map(l => (
                              <tr key={l.ledger_id} className="transition-colors hover:bg-[#f0f9ff]">
                                <td className="px-4 py-3 font-mono text-xs text-[#0b1c30]">{formatDate(l.criado_em)}</td>
                                <td className="px-4 py-3 text-sm text-[#0b1c30]">#{l.numero_pedido}</td>
                                <td className="px-4 py-3 font-mono text-xs text-[#64748b]">{l.valor_total_pedido ? formatCurrencyBRL(l.valor_total_pedido) : "-"}</td>
                                <td className="px-4 py-3 text-right font-mono text-sm text-[#64748b]">{l.valor_item ? formatCurrencyBRL(l.valor_item) : "-"}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    l.metodo_pagamento === "pix" ? "bg-[#f0fdf4] text-[#15803d]" : "bg-[#eff6ff] text-[#2563eb]"
                                  }`}>
                                    <span className="material-symbols-outlined text-[12px]">
                                      {l.metodo_pagamento === "pix" ? "qr_code" : "credit_card"}
                                    </span>
                                    {PAYMENT_LABELS[l.metodo_pagamento] || l.metodo_pagamento}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#0b1c30]">{formatCurrencyBRL(l.taxa_entrega)}</td>
                                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#059669]">+{formatCurrencyBRL(l.valor_entrega)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-[#bae6fd]">
                            <tr className="bg-[#f0f9ff]">
                              <td colSpan={5} className="px-4 py-3 text-sm font-bold text-[#0b1c30]">Total Online</td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#0b1c30]">{formatCurrencyBRL(extratoData.resumo.total_online)}</td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#059669]">{formatCurrencyBRL(extratoData.resumo.total_online)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="rounded-xl border-2 border-[#059669] bg-white p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Calculator className="h-5 w-5 text-[#059669]" />
                          <span className="text-sm font-bold text-[#0b1c30]">Conta Final — {extratoData.entregador.nome}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between py-1.5">
                            <span className="text-[#64748b]">Total de entregas online (plataforma repassa)</span>
                            <span className="font-mono font-bold text-[#0b1c30]">{formatCurrencyBRL(extratoData.resumo.total_online)}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-t border-dashed border-[#e2e8f0]">
                            <span className="text-[#b91c1c]">(-) Taxa plataforma das entregas em dinheiro ({extratoData.resumo.qtd_cash} entregas)</span>
                            <span className="font-mono font-bold text-[#b91c1c]">-{formatCurrencyBRL(extratoData.resumo.total_taxa_plataforma)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-t-2 border-[#059669] bg-[#f0fdf4] -mx-5 px-5 rounded-b-xl">
                            <span className="font-bold text-[#059669]">Plataforma repassa ao Entregador</span>
                            <span className="font-mono text-lg font-bold text-[#059669]">{formatCurrencyBRL(extratoData.resumo.saldo_online_liquido)}</span>
                          </div>

                          {extratoData.resumo.qtd_online > 0 && (
                            <div className="mt-3 rounded-lg bg-[#e0f2fe] border border-[#bae6fd] p-3 text-xs text-[#0369a1]">
                              <p className="font-bold mb-0.5">💡 Sobre as entregas online ({extratoData.resumo.qtd_online}x)</p>
                              <p>O valor de <strong>{formatCurrencyBRL(extratoData.resumo.total_online)}</strong> já está retido na plataforma (split do pagamento). A plataforma repassa esse valor integral ao entregador — sem descontos.</p>
                            </div>
                          )}
                          {extratoData.resumo.qtd_cash > 0 && (
                            <div className="mt-3 rounded-lg bg-[#fef3c7] border border-[#fde68a] p-3 text-xs text-[#b45309]">
                              <p className="font-bold mb-0.5">💡 Sobre as entregas em dinheiro ({extratoData.resumo.qtd_cash}x)</p>
                              <p>O entregador já coletou <strong>{formatCurrencyBRL(extratoData.resumo.total_cash)}</strong> dos clientes. Ele deve pagar <strong>{formatCurrencyBRL(extratoData.resumo.total_taxa_plataforma)}</strong> em taxas à plataforma. Essas taxas são abatidas do valor a ser repassado.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
