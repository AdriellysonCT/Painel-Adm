"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, LayoutDashboard, Receipt, Wallet, TrendingUp, PieChart } from "lucide-react"
import RepassesDashboardClient from './repasses-dashboard-client'
import ResumoClient from './resumo-client'
import HistoricoClient from './historico-client'
import FechamentosClient from './fechamentos-client'
import PagamentosPendentesClient from './pagamentos-pendentes-client'
import ReceitaPlataformaClient from './receita-plataforma-client'
import BreakdownFinanceiroClient from './breakdown-financeiro-client'

type Modo = 'restaurante' | 'entregador'
type Tab = 'dashboard' | 'breakdown' | 'pagamentos' | 'receita' | 'fechamentos'

export default function DashboardWrapperClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [modo, setModo] = useState<Modo>('restaurante')
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<{ id: string; nome: string } | null>(null)
    
    // Ler aba da URL ou usar 'dashboard' como padrão
    const activeTab = (searchParams.get('tab') as Tab) || 'dashboard'

    const handleTabChange = (newTab: string) => {
        // Atualizar URL sem recarregar a página
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', newTab)
        router.push(`?${params.toString()}`, { scroll: false })
    }

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full max-w-[1000px] grid-cols-5 mb-6">
                <TabsTrigger value="dashboard" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                </TabsTrigger>
                <TabsTrigger value="breakdown" className="gap-2">
                    <PieChart className="h-4 w-4" />
                    Breakdown
                </TabsTrigger>
                <TabsTrigger value="pagamentos" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Pagamentos
                </TabsTrigger>
                <TabsTrigger value="receita" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Receita
                </TabsTrigger>
                <TabsTrigger value="fechamentos" className="gap-2">
                    <Receipt className="h-4 w-4" />
                    Fechamentos
                </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
                <div className="mt-2">
                    <RepassesDashboardClient 
                        modo={modo} 
                        onModoChange={(novoModo) => {
                            setModo(novoModo)
                            setUsuarioSelecionado(null)
                        }}
                        onUsuarioClick={(id, nome) => setUsuarioSelecionado({ id, nome })}
                        usuarioSelecionadoId={usuarioSelecionado?.id}
                    />
                </div>

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
                                        Mostrando apenas: <span className="font-semibold text-emerald-600">{usuarioSelecionado.nome}</span>
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
            </TabsContent>

            <TabsContent value="breakdown">
                <BreakdownFinanceiroClient />
            </TabsContent>

            <TabsContent value="pagamentos">
                <PagamentosPendentesClient />
            </TabsContent>

            <TabsContent value="receita">
                <ReceitaPlataformaClient />
            </TabsContent>

            <TabsContent value="fechamentos">
                <FechamentosClient />
            </TabsContent>
        </Tabs>
    )
}
