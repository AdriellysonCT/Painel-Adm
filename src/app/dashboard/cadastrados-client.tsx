"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Store, Phone, Mail, Calendar, FileText, ExternalLink, Search, Car } from "lucide-react"
import Image from "next/image"

type Restaurante = {
    id: string
    nome_fantasia: string | null
    cnpj: string | null
    nome_responsavel: string | null
    telefone: string | null
    email: string | null
    imagem_url: string | null
    created_at: string
}

type Entregador = {
    id: string
    nome: string | null
    cpf: string | null
    telefone: string | null
    selfie_url: string | null
    created_at: string
    status_online: boolean
    placa_veiculo: string | null
}

export default function CadastradosClient() {
    const [tipo, setTipo] = useState<'restaurante' | 'entregador'>('restaurante')
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
    const [entregadores, setEntregadores] = useState<Entregador[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    
    const [selectedItem, setSelectedItem] = useState<Restaurante | Entregador | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                if (tipo === 'restaurante') {
                    const { data, error } = await supabase
                        .from('restaurantes_app')
                        .select('id, nome_fantasia, cnpj, nome_responsavel, telefone, email, imagem_url, created_at')
                        .order('created_at', { ascending: false })
                    
                    if (error) throw error
                    setRestaurantes(data || [])
                } else {
                    const { data, error } = await supabase
                        .from('entregadores_app')
                        .select('id, nome, cpf, telefone, selfie_url, created_at, status_online, placa_veiculo')
                        .order('created_at', { ascending: false })
                    
                    if (error) throw error
                    setEntregadores(data || [])
                }
            } catch (err) {
                console.error('Erro ao buscar dados:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [tipo])

    const filteredItems = useMemo(() => {
        const term = search.toLowerCase().trim()
        if (tipo === 'restaurante') {
            return restaurantes.filter(r => 
                r.nome_fantasia?.toLowerCase().includes(term) || 
                r.cnpj?.includes(term) ||
                r.nome_responsavel?.toLowerCase().includes(term)
            )
        } else {
            return entregadores.filter(e => 
                e.nome?.toLowerCase().includes(term) || 
                e.cpf?.includes(term) ||
                e.telefone?.includes(term)
            )
        }
    }, [tipo, restaurantes, entregadores, search])

    const handleOpenModal = (item: Restaurante | Entregador) => {
        setSelectedItem(item)
        setModalOpen(true)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getImageUrl = (url: string | null, bucket: string) => {
        if (!url) return null
        if (url.startsWith('http')) {
            // Remove barras duplas extras, mas preserva especificamente o '://' do protocolo
            const parts = url.split('://')
            if (parts.length === 2) {
                return `${parts[0]}://${parts[1].replace(/\/+/g, '/')}`
            }
            return url
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(url)
        return data.publicUrl
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Tabs value={tipo} onValueChange={(v) => setTipo(v as any)} className="w-[400px]">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="restaurante" className="gap-2">
                                <Store className="h-4 w-4" />
                                Restaurantes
                            </TabsTrigger>
                            <TabsTrigger value="entregador" className="gap-2">
                                <User className="h-4 w-4" />
                                Entregadores
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder={`Buscar ${tipo === 'restaurante' ? 'restaurante' : 'entregador'}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{tipo === 'restaurante' ? 'Restaurante' : 'Entregador'}</TableHead>
                                <TableHead>{tipo === 'restaurante' ? 'CNPJ' : 'CPF'}</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Cadastro</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Carregando...
                                    </TableCell>
                                </TableRow>
                            ) : filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal(item)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                {tipo === 'restaurante' ? (
                                                    <>
                                                        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden relative border">
                                                            {getImageUrl((item as Restaurante).imagem_url, 'logosrestaurantes') ? (
                                                                <img 
                                                                    src={getImageUrl((item as Restaurante).imagem_url, 'logosrestaurantes')!} 
                                                                    alt="" 
                                                                    className="object-cover w-full h-full"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Logo';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Store className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <span>{(item as Restaurante).nome_fantasia || 'Sem nome'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden relative border">
                                                            {getImageUrl((item as Entregador).selfie_url, 'selfiesentregadores') ? (
                                                                <img 
                                                                    src={getImageUrl((item as Entregador).selfie_url, 'selfiesentregadores')!} 
                                                                    alt="" 
                                                                    className="object-cover w-full h-full"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Selfie';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <User className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <span>{(item as Entregador).nome || 'Sem nome'}</span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {tipo === 'restaurante' ? (item as Restaurante).cnpj : (item as Entregador).cpf}
                                        </TableCell>
                                        <TableCell>
                                            {(item as Restaurante | Entregador).telefone || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(item.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {tipo === 'restaurante' ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}
                            Detalhes do {tipo === 'restaurante' ? 'Restaurante' : 'Entregador'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedItem && (
                        <div className="grid gap-6 py-4">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-32 w-32 rounded-lg border-2 border-dashed border-muted flex items-center justify-center overflow-hidden bg-muted/30">
                                        {tipo === 'restaurante' ? (
                                            getImageUrl((selectedItem as Restaurante).imagem_url, 'logosrestaurantes') ? (
                                                <img 
                                                    src={getImageUrl((selectedItem as Restaurante).imagem_url, 'logosrestaurantes')!} 
                                                    alt="Logo" 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Sem+Logo';
                                                    }}
                                                />
                                            ) : <Store className="h-10 w-10 text-muted-foreground" />
                                        ) : (
                                            getImageUrl((selectedItem as Entregador).selfie_url, 'selfiesentregadores') ? (
                                                <img 
                                                    src={getImageUrl((selectedItem as Entregador).selfie_url, 'selfiesentregadores')!} 
                                                    alt="Selfie" 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Sem+Selfie';
                                                    }}
                                                />
                                            ) : <User className="h-10 w-10 text-muted-foreground" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        {tipo === 'restaurante' ? 'Logo da Loja' : 'Selfie do Entregador'}
                                    </p>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold leading-none">
                                            {tipo === 'restaurante' 
                                                ? (selectedItem as Restaurante).nome_fantasia 
                                                : (selectedItem as Entregador).nome}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">ID: {selectedItem.id}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <FileText className="h-4 w-4" />
                                                <span>{tipo === 'restaurante' ? 'CNPJ' : 'CPF'}</span>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {tipo === 'restaurante' 
                                                    ? (selectedItem as Restaurante).cnpj || 'Não informado'
                                                    : (selectedItem as Entregador).cpf || 'Não informado'}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>Data de Cadastro</span>
                                            </div>
                                            <p className="text-sm font-medium">{formatDate(selectedItem.created_at)}</p>
                                        </div>

                                        {tipo === 'restaurante' && (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <User className="h-4 w-4" />
                                                    <span>Responsável</span>
                                                </div>
                                                <p className="text-sm font-medium">{(selectedItem as Restaurante).nome_responsavel || 'Não informado'}</p>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-4 w-4" />
                                                <span>Telefone</span>
                                            </div>
                                            <p className="text-sm font-medium">{(selectedItem as Restaurante | Entregador).telefone || 'Não informado'}</p>
                                        </div>

                                        {tipo === 'restaurante' && (
                                            <div className="space-y-1 col-span-1 sm:col-span-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail className="h-4 w-4" />
                                                    <span>E-mail</span>
                                                </div>
                                                <p className="text-sm font-medium">{(selectedItem as Restaurante).email || 'Não informado'}</p>
                                            </div>
                                        )}

                                        {tipo === 'entregador' && (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Car className="h-4 w-4" />
                                                    <span>Placa do Veículo</span>
                                                </div>
                                                <p className="text-sm font-medium font-mono tracking-widest">
                                                    {(selectedItem as Entregador).placa_veiculo 
                                                        ? (selectedItem as Entregador).placa_veiculo!.toUpperCase()
                                                        : 'Não informada'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
