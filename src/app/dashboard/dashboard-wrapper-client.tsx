"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import RepassesDashboardClient from './repasses-dashboard-client'
import ResumoClient from './resumo-client'
import HistoricoClient from './historico-client'

type Modo = 'restaurante' | 'entregador'

export default function DashboardWrapperClient() {
    const [modo, setModo] = useState<Modo>('restaurante')
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<{ id: string; nome: string } | null>(null)

    return (
        <>
            <div className="mt-2">
                <RepassesDashboardClient 
                    modo={modo} 
                    onModoChange={(novoModo) => {
                        setModo(novoModo)
                        setUsuarioSelecionado(null) // Limpar seleção ao mudar de modo
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
        </>
    )
}
