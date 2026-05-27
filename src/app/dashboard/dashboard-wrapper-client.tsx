"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, ArrowUpDown, Search, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Sidebar from './sidebar'
import CadastradosClient from './cadastrados-client'
import RepassesDashboardClient from './repasses-dashboard-client'
import ResumoClient from './resumo-client'
import HistoricoClient from './historico-client'
import FechamentosClient from './fechamentos-client'
import PagamentosPendentesClient from './pagamentos-pendentes-client'
import ReceitaPlataformaClient from './receita-plataforma-client'
import BreakdownFinanceiroClient from './breakdown-financeiro-client'
import CuponsClient from './cupons-client'
import BannersManagerClient from './banners-manager-client'
import LedgerEntregadoresClient from './ledger-entregadores-client'

type Modo = 'restaurante' | 'entregador'
type Tab = 'dashboard' | 'breakdown' | 'pagamentos' | 'receita' | 'fechamentos' | 'cupons' | 'banners' | 'cadastrados' | 'ledger'

const tabTitle: Record<Tab, string> = {
  dashboard: 'Dashboard',
  cadastrados: 'Cadastrados',
  breakdown: 'Breakdown Financeiro',
  pagamentos: 'Pagamentos Pendentes',
  receita: 'Receita da Plataforma',
  fechamentos: 'Fechamentos',
  cupons: 'Cupons',
  ledger: 'Ledger de Entregadores',
  banners: 'Estúdio de Banners',
}

const tabDescription: Record<Tab, string> = {
  dashboard: 'Resumo de repasses, extratos e saldos.',
  cadastrados: 'Usuários cadastrados na plataforma.',
  breakdown: 'Detalhamento financeiro completo.',
  pagamentos: 'Pagamentos pendentes de processamento.',
  receita: 'Receitas geradas pela plataforma.',
  fechamentos: 'Fechamentos contábeis por período.',
  cupons: 'Gerenciamento de cupons promocionais.',
  ledger: 'Relatório detalhado de entradas, saídas e saldos pendentes.',
  banners: 'Crie e gerencie banners promocionais com mídia customizada e animações.',
}

export default function DashboardWrapperClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [modo, setModo] = useState<Modo>('restaurante')
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<{ id: string; nome: string } | null>(null)
    
    const activeTab = (searchParams.get('tab') as Tab) || 'dashboard'

    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <div className="ml-[260px] w-[calc(100%-260px)]">
                <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-[#0b1c30]">FomeNinja Admin</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'ledger' && (
                            <Button variant="outline" size="sm" className="gap-2 border-[#cbd5e1] text-[#2563eb]">
                                <Download className="size-4" />
                                Exportar Relatório
                            </Button>
                        )}
                    </div>
                </header>

                <main className="p-6">
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold text-[#0b1c30]">{tabTitle[activeTab]}</h3>
                        <p className="text-sm text-[#64748b] mt-1">{tabDescription[activeTab]}</p>
                    </div>

                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <RepassesDashboardClient 
                                modo={modo} 
                                onModoChange={(novoModo) => {
                                    setModo(novoModo)
                                    setUsuarioSelecionado(null)
                                }}
                                onUsuarioClick={(id, nome) => setUsuarioSelecionado({ id, nome })}
                                usuarioSelecionadoId={usuarioSelecionado?.id}
                            />

                            <div className="grid gap-6 lg:grid-cols-2">
                                <Card>
                                    <CardHeader className="flex items-center justify-between">
                                        <CardTitle>
                                            {modo === 'restaurante' ? 'Resumo por Restaurante' : 'Resumo por Entregador'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResumoClient modo={modo} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Histórico de Movimentações</CardTitle>
                                            {usuarioSelecionado && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Mostrando apenas: <span className="font-semibold text-[#2563eb]">{usuarioSelecionado.nome}</span>
                                                    <button 
                                                        onClick={() => setUsuarioSelecionado(null)}
                                                        className="ml-2 text-xs underline hover:text-foreground"
                                                    >
                                                        Limpar filtro
                                                    </button>
                                                </p>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Download className="size-4" />
                                            Exportar
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <HistoricoClient modo={modo} usuarioId={usuarioSelecionado?.id} />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cadastrados' && <CadastradosClient />}
                    {activeTab === 'breakdown' && <BreakdownFinanceiroClient />}
                    {activeTab === 'pagamentos' && <PagamentosPendentesClient />}
                    {activeTab === 'receita' && <ReceitaPlataformaClient />}
                    {activeTab === 'fechamentos' && <FechamentosClient />}
                    {activeTab === 'cupons' && <CuponsClient />}
                    {activeTab === 'ledger' && <LedgerEntregadoresClient />}
                    {activeTab === 'banners' && <BannersManagerClient />}
                </main>
            </div>
        </div>
    )
}
