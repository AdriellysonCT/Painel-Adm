"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"

export default function DebugPanel() {
    const [debug, setDebug] = useState<any>({})

    useEffect(() => {
        (async () => {
            const results: any = {}

            // Testar conexão básica
            try {
                const { data, error } = await supabase.from('restaurantes_app').select('*').limit(1)
                results.restaurantes_test = { success: !error, count: data?.length || 0, error: error?.message }
            } catch (e: any) {
                results.restaurantes_test = { success: false, error: e.message }
            }

            // Testar entregadores
            try {
                const { data, error } = await supabase.from('entregadores_app').select('*').limit(1)
                results.entregadores_test = { success: !error, count: data?.length || 0, error: error?.message }
            } catch (e: any) {
                results.entregadores_test = { success: false, error: e.message }
            }

            // Testar movimentações
            try {
                const { data, error } = await supabase.from('movimentacoes_carteira').select('*').limit(1)
                results.movimentacoes_test = { success: !error, count: data?.length || 0, error: error?.message }
            } catch (e: any) {
                results.movimentacoes_test = { success: false, error: e.message }
            }

            // Testar view
            try {
                const { data, error } = await supabase.from('view_extrato_carteira').select('*').limit(1)
                results.view_test = { success: !error, count: data?.length || 0, error: error?.message }
            } catch (e: any) {
                results.view_test = { success: false, error: e.message }
            }

            // Testar repasses_restaurantes
            try {
                const { data, error } = await supabase.from('repasses_restaurantes').select('*').limit(1)
                results.repasses_test = { success: !error, count: data?.length || 0, error: error?.message }
            } catch (e: any) {
                results.repasses_test = { success: false, error: e.message }
            }

            setDebug(results)
        })()
    }, [])

    return (
        <Card className="border-yellow-500 bg-yellow-50">
            <CardHeader>
                <CardTitle className="text-sm">🐛 Debug - Conexão com Banco de Dados</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 text-xs font-mono">
                    {Object.entries(debug).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2">
                            <span className={value.success ? 'text-green-600' : 'text-red-600'}>
                                {value.success ? '✅' : '❌'}
                            </span>
                            <span className="font-semibold">{key}:</span>
                            <span>
                                {value.success 
                                    ? `OK (${value.count} registros)` 
                                    : `ERRO: ${value.error}`
                                }
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-2 bg-white rounded text-xs">
                    <strong>Instruções:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Se todos os testes falharem, execute o script SQL no Supabase</li>
                        <li>Abra o arquivo <code>SETUP-DATABASE.md</code> para instruções</li>
                        <li>Execute o conteúdo de <code>supabase-setup.sql</code> no SQL Editor</li>
                        <li>Recarregue esta página</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
    )
}
