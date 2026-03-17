"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Ticket, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Cupom = {
    id: string
    id_restaurante: string
    codigo: string
    descricao: string
    tipo_desconto: string
    valor_desconto: number
    valor_minimo_pedido: number | null
    data_inicio: string
    data_fim: string | null
    ativo: boolean
    criado_em: string
}

type Restaurante = {
    id: string
    nome_fantasia: string
}

export default function CuponsClient() {
    const [cupons, setCupons] = useState<Cupom[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
    
    // Form state
    const [novoCupom, setNovoCupom] = useState({
        id_restaurante: "",
        codigo: "",
        descricao: "",
        valor_desconto: "",
        tipo_desconto: "valor_fixo",
        valor_minimo_pedido: "0",
        data_fim: "",
        ativo: true
    })

    useEffect(() => {
        fetchCupons()
        fetchRestaurantes()
    }, [])

    const fetchRestaurantes = async () => {
        try {
            const { data, error } = await supabase
                .from("restaurantes_app")
                .select("id, nome_fantasia")
                .order("nome_fantasia")
            
            if (error) throw error
            setRestaurantes(data || [])
        } catch (error: any) {
            console.error("Erro ao buscar restaurantes:", error.message)
        }
    }

    const fetchCupons = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("cupons")
                .select("*")
                .order("criado_em", { ascending: false })

            if (error) throw error
            setCupons(data || [])
        } catch (error: any) {
            console.error("Erro ao buscar cupons:", error.message || error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCupom = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsSubmitting(true)
            
            const payload = {
                id_restaurante: novoCupom.id_restaurante,
                codigo: novoCupom.codigo.toUpperCase(),
                descricao: novoCupom.descricao,
                valor_desconto: parseFloat(novoCupom.valor_desconto),
                tipo_desconto: novoCupom.tipo_desconto,
                valor_minimo_pedido: parseFloat(novoCupom.valor_minimo_pedido),
                data_inicio: new Date().toISOString(),
                data_fim: novoCupom.data_fim ? new Date(novoCupom.data_fim).toISOString() : null,
                ativo: novoCupom.ativo
            }

            const { error } = await supabase
                .from("cupons")
                .insert([payload])

            if (error) throw error

            setIsDialogOpen(false)
            setNovoCupom({
                id_restaurante: "",
                codigo: "",
                descricao: "",
                valor_desconto: "",
                tipo_desconto: "valor_fixo",
                valor_minimo_pedido: "0",
                data_fim: "",
                ativo: true
            })
            fetchCupons()
        } catch (error: any) {
            alert("Erro ao criar cupom: " + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("cupons")
                .update({ ativo: !currentStatus })
                .eq("id", id)

            if (error) throw error
            fetchCupons()
        } catch (error: any) {
            alert("Erro ao atualizar status: " + error.message)
        }
    }

    const deleteCupom = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este cupom?")) return
        
        try {
            const { error } = await supabase
                .from("cupons")
                .delete()
                .eq("id", id)

            if (error) throw error
            fetchCupons()
        } catch (error: any) {
            alert("Erro ao excluir cupom: " + error.message)
        }
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                <div>
                    <CardTitle className="text-2xl font-bold">Gestão de Cupons</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Crie e gerencie cupons de desconto para os clientes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCupons} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Cupom
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Criar Novo Cupom</DialogTitle>
                                <DialogDescription>
                                    Preencha os dados do cupom. O código será convertido para maiúsculas.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateCupom} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="restaurante">Restaurante</Label>
                                    <Select 
                                        value={novoCupom.id_restaurante} 
                                        onValueChange={(v) => setNovoCupom({...novoCupom, id_restaurante: v})}
                                        required
                                    >
                                        <SelectTrigger id="restaurante">
                                            <SelectValue placeholder="Selecione o restaurante" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {restaurantes.map(r => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.nome_fantasia}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="codigo">Código do Cupom</Label>
                                    <Input 
                                        id="codigo" 
                                        placeholder="EX: NINJA30" 
                                        value={novoCupom.codigo}
                                        onChange={e => setNovoCupom({...novoCupom, codigo: e.target.value})}
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="descricao">Descrição</Label>
                                    <Input 
                                        id="descricao" 
                                        placeholder="EX: 10 reais de desconto" 
                                        value={novoCupom.descricao}
                                        onChange={e => setNovoCupom({...novoCupom, descricao: e.target.value})}
                                        required 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="valor">Valor do Desconto</Label>
                                        <Input 
                                            id="valor" 
                                            type="number" 
                                            step="0.01"
                                            value={novoCupom.valor_desconto}
                                            onChange={e => setNovoCupom({...novoCupom, valor_desconto: e.target.value})}
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tipo">Tipo</Label>
                                        <Select 
                                            value={novoCupom.tipo_desconto} 
                                            onValueChange={(v) => setNovoCupom({...novoCupom, tipo_desconto: v})}
                                        >
                                            <SelectTrigger id="tipo">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="valor_fixo">Fixo (R$)</SelectItem>
                                                <SelectItem value="porcentagem">Porcentagem (%)</SelectItem>
                                                <SelectItem value="frete_gratis">Frete Grátis</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="minimo">Valor Mínimo do Pedido (R$)</Label>
                                    <Input 
                                        id="minimo" 
                                        type="number" 
                                        step="0.01"
                                        value={novoCupom.valor_minimo_pedido}
                                        onChange={e => setNovoCupom({...novoCupom, valor_minimo_pedido: e.target.value})}
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data_fim">Data de Expiração (Opcional)</Label>
                                    <Input 
                                        id="data_fim" 
                                        type="date"
                                        value={novoCupom.data_fim}
                                        onChange={e => setNovoCupom({...novoCupom, data_fim: e.target.value})}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                                        {isSubmitting ? "Criando..." : "Criar Cupom"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Código</TableHead>
                                <TableHead className="font-bold">Desconto</TableHead>
                                <TableHead className="font-bold text-center">Mínimo</TableHead>
                                <TableHead className="font-bold">Validade</TableHead>
                                <TableHead className="font-bold text-center">Status</TableHead>
                                <TableHead className="font-bold text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Carregando cupons...
                                    </TableCell>
                                </TableRow>
                            ) : cupons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Ticket className="h-8 w-8 opacity-20" />
                                            <span>Nenhum cupom encontrado.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                cupons.map((cupom) => (
                                    <TableRow key={cupom.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-mono font-bold text-emerald-600">
                                            {cupom.codigo}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-bold border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                {cupom.tipo_desconto === "porcentagem" 
                                                    ? `${cupom.valor_desconto}%` 
                                                    : `R$ ${parseFloat(cupom.valor_desconto.toString()).toFixed(2)}`
                                                }
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            R$ {parseFloat((cupom.valor_minimo_pedido || 0).toString()).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            {cupom.data_fim 
                                                ? format(new Date(cupom.data_fim), "dd/MM/yyyy", { locale: ptBR })
                                                : "Permanente"
                                            }
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button onClick={() => toggleStatus(cupom.id, cupom.ativo)}>
                                                <Badge className={cupom.ativo 
                                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                                }>
                                                    {cupom.ativo ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => deleteCupom(cupom.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30 flex gap-4">
                        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400">Dica de Segurança</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                                Cupons desativados não podem ser aplicados por clientes no checkout, mas ainda aparecem no histórico.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
