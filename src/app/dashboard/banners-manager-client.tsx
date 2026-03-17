"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Image, Plus, Trash2, RefreshCw, Layout, Search, Clock, Check, Pencil, ShoppingBag, X } from "lucide-react"

type Banner = {
    id: string
    titulo: string
    subtitulo: string
    cor_fundo: string
    emoji: string
    botao_texto: string
    tipo_link: string
    link_id: string
    item_id: string | null
    ativo: boolean
    ordem: number
    horario_inicio: string | null
    horario_fim: string | null
}

type Entity = {
    id: string
    nome: string
}

const INITIAL_BANNER_STATE = {
    titulo: "",
    subtitulo: "",
    cor_fundo: "bg-orange-600",
    emoji: "🔥",
    botao_texto: "Ver Agora",
    tipo_link: "home",
    link_id: "",
    item_id: null as string | null,
    ativo: true,
    ordem: 0,
    horario_inicio: "",
    horario_fim: ""
}

export default function BannersManagerClient() {
    const [banners, setBanners] = useState<Banner[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    
    // Listas para seleção inteligente
    const [restaurants, setRestaurants] = useState<Entity[]>([])
    const [categories, setCategories] = useState<Entity[]>([])
    const [items, setItems] = useState<Entity[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [itemSearchTerm, setItemSearchTerm] = useState("")

    const [novoBanner, setNovoBanner] = useState(INITIAL_BANNER_STATE)

    useEffect(() => {
        fetchBanners()
        fetchEntities()
    }, [])

    // Buscar itens quando o restaurante mudar
    useEffect(() => {
        if (novoBanner.tipo_link === 'restaurant' && novoBanner.link_id) {
            fetchItems(novoBanner.link_id)
        } else {
            setItems([])
            if (!editingId) setNovoBanner(prev => ({ ...prev, item_id: null }))
        }
    }, [novoBanner.link_id, novoBanner.tipo_link])

    const fetchBanners = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("banners_promocionais")
                .select("*")
                .order("ordem", { ascending: true })

            if (error) throw error
            setBanners(data || [])
        } catch (error) {
            console.error("Erro ao buscar banners:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchEntities = async () => {
        try {
            // 1. Buscar Restaurantes
            const { data: restData } = await supabase
                .from("restaurantes_app")
                .select("id, nome_fantasia, tipo_restaurante")
            
            if (restData) {
                setRestaurants(restData.map(r => ({ id: r.id, nome: r.nome_fantasia })))
            }

            // 2. Buscar Categorias Únicas (de Restaurantes e de Itens)
            const categoriasSet = new Set<string>()
            
            // Categorias dos Restaurantes
            restData?.forEach(r => {
                if (r.tipo_restaurante) categoriasSet.add(r.tipo_restaurante)
            })

            // Categorias dos Itens
            const { data: itemCats } = await supabase
                .from("itens_cardapio")
                .select("categoria")
            
            itemCats?.forEach(i => {
                if (i.categoria) categoriasSet.add(i.categoria)
            })

            const uniqueCats: Entity[] = Array.from(categoriasSet)
                .sort()
                .map(cat => ({ id: cat, nome: cat }))
            
            setCategories(uniqueCats)

        } catch (error) {
            console.error("Erro ao buscar entidades:", error)
        }
    }

    const fetchItems = async (restaurantId: string) => {
        try {
            const { data, error } = await supabase
                .from("itens_cardapio")
                .select("id, nome")
                .eq("id_restaurante", restaurantId)
            
            if (error) throw error
            setItems(data?.map(i => ({ id: i.id, nome: i.nome })) || [])
        } catch (error) {
            console.error("Erro ao buscar itens:", error)
        }
    }

    const handleOpenDialog = (banner?: Banner) => {
        if (banner) {
            setEditingId(banner.id)
            setNovoBanner({
                titulo: banner.titulo,
                subtitulo: banner.subtitulo || "",
                cor_fundo: banner.cor_fundo,
                emoji: banner.emoji,
                botao_texto: banner.botao_texto,
                tipo_link: banner.tipo_link,
                link_id: banner.link_id || "",
                item_id: banner.item_id,
                ativo: banner.ativo,
                ordem: banner.ordem,
                horario_inicio: banner.horario_inicio || "",
                horario_fim: banner.horario_fim || ""
            })
            
            // Set search terms if applicable
            if (banner.tipo_link === 'restaurant') {
                const entity = restaurants.find(r => r.id === banner.link_id)
                if (entity) setSearchTerm(entity.nome)
                
                // Fetch items immediately to allow selecting the correct item name
                if (banner.link_id) {
                    fetchItems(banner.link_id).then(() => {
                        // After items are loaded, if there's an item_id, find its name for the search term
                        // This might be tricky because fetchItems is async. 
                        // Let's improve this inside the fetchItems call context if needed or use a separate effect
                    })
                }
            } else if (banner.tipo_link === 'category') {
                setSearchTerm(banner.link_id || "")
            }
        } else {
            setEditingId(null)
            setNovoBanner(INITIAL_BANNER_STATE)
            setSearchTerm("")
            setItemSearchTerm("")
        }
        setIsDialogOpen(true)
    }

    // Effect to set itemSearchTerm when items list is populated during edit
    useEffect(() => {
        if (editingId && novoBanner.item_id && items.length > 0) {
            const item = items.find(i => i.id === novoBanner.item_id)
            if (item) setItemSearchTerm(item.nome)
        }
    }, [items, editingId, novoBanner.item_id])

    const handleSaveBanner = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsSubmitting(true)
            
            const payload = { ...novoBanner }
            if (!payload.horario_inicio) (payload as any).horario_inicio = null
            if (!payload.horario_fim) (payload as any).horario_fim = null

            if (editingId) {
                const { error } = await supabase
                    .from("banners_promocionais")
                    .update(payload)
                    .eq("id", editingId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from("banners_promocionais")
                    .insert([payload])
                if (error) throw error
            }

            setIsDialogOpen(false)
            setNovoBanner(INITIAL_BANNER_STATE)
            setEditingId(null)
            fetchBanners()
        } catch (error: any) {
            alert("Erro ao salvar banner: " + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("banners_promocionais")
                .update({ ativo: !currentStatus })
                .eq("id", id)

            if (error) throw error
            fetchBanners()
        } catch (error: any) {
            alert("Erro ao atualizar status: " + error.message)
        }
    }

    const deleteBanner = async (id: string) => {
        if (!confirm("Excluir este banner permanentemente?")) return
        try {
            const { error } = await supabase
                .from("banners_promocionais")
                .delete()
                .eq("id", id)

            if (error) throw error
            fetchBanners()
        } catch (error: any) {
            alert("Erro ao excluir banner: " + error.message)
        }
    }

    const filteredResults = novoBanner.tipo_link === 'restaurant' 
        ? restaurants.filter(r => r.nome.toLowerCase().includes(searchTerm.toLowerCase()))
        : novoBanner.tipo_link === 'category'
        ? categories.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
        : []

    const filteredItems = items.filter(i => i.nome.toLowerCase().includes(itemSearchTerm.toLowerCase()))

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                <div>
                    <CardTitle className="text-2xl font-bold italic">Editor Ninja de Banners</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Crie e gerencie sua vitrine inteligente em tempo real.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchBanners} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar Banners
                    </Button>
                    <Button 
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                        onClick={() => handleOpenDialog()}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Banner
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent className="sm:max-w-[550px] overflow-y-auto max-h-[90vh] rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">
                                    {editingId ? "Editar Banner Inteligente" : "Criar Banner Inteligente"}
                                </DialogTitle>
                                <DialogDescription>Personalize o visual e defina para onde o cliente será levado.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSaveBanner} className="space-y-6 py-2">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Título Chamativo</Label>
                                            <Input 
                                                placeholder="Ex: Pizza em Dobro!" 
                                                value={novoBanner.titulo}
                                                onChange={e => setNovoBanner({...novoBanner, titulo: e.target.value})}
                                                required 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Subtítulo / Descrição</Label>
                                            <Input 
                                                placeholder="Ex: Compre 1 leve 2" 
                                                value={novoBanner.subtitulo}
                                                onChange={e => setNovoBanner({...novoBanner, subtitulo: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label>Ícone Central (Emoji)</Label>
                                            <div className="flex flex-wrap gap-2 p-3 border rounded-2xl bg-muted/20 max-h-32 overflow-y-auto">
                                                {["🍕", "🍔", "🍟", "🌭", "🍱", "🍜", "🍝", "Sushi", "🍣", "🍛", "🥙", "🥪", "🥗", "🍗", "🥩", "🌮", "🌯", "🥘", "🍳", "🥐", "🍇", "🍦", "🍧", "🍨", "🍩", "🧁", "🍰", "🧊", "🥤", "🧋", "🍺", "🍷", "🍹", "🔥", "🚀", "⚡", "💎", "🎁", "📦", "🛒", "🛍️", "🏠"].map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => setNovoBanner({...novoBanner, emoji: emoji})}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all hover:scale-110 active:scale-90 ${novoBanner.emoji === emoji ? 'bg-orange-600 text-white shadow-md' : 'bg-white hover:bg-orange-50'}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Outro:</span>
                                                    <Input 
                                                        className="w-12 h-10 text-center p-0 rounded-xl"
                                                        value={novoBanner.emoji}
                                                        maxLength={2}
                                                        onChange={e => setNovoBanner({...novoBanner, emoji: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Visual do Card</Label>
                                            <Select 
                                                value={novoBanner.cor_fundo} 
                                                onValueChange={(v) => setNovoBanner({...novoBanner, cor_fundo: v})}
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="bg-orange-600">Laranja Ninja (Padrão)</SelectItem>
                                                    <SelectItem value="bg-red-600">Vermelho Urgente</SelectItem>
                                                    <SelectItem value="bg-emerald-600">Verde Promoção</SelectItem>
                                                    <SelectItem value="bg-blue-600">Azul Especial</SelectItem>
                                                    <SelectItem value="bg-purple-600">Roxo Premium</SelectItem>
                                                    <SelectItem value="bg-zinc-900">Preto Elegante</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <Label className="font-bold flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-orange-600" />
                                        Ação ao Clicar
                                    </Label>
                                    <div className="space-y-3">
                                        <Select 
                                            value={novoBanner.tipo_link} 
                                            onValueChange={(v) => {
                                                setNovoBanner({...novoBanner, tipo_link: v, link_id: "", item_id: null})
                                                setSearchTerm("")
                                                setItemSearchTerm("")
                                            }}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder="O que acontece ao clicar?" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="home">Ir para Início</SelectItem>
                                                <SelectItem value="restaurant">Abrir um Restaurante</SelectItem>
                                                <SelectItem value="category">Abrir uma Categoria</SelectItem>
                                                <SelectItem value="coupons">Ir para Cupons</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {(novoBanner.tipo_link === 'restaurant' || novoBanner.tipo_link === 'category') && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        placeholder={novoBanner.tipo_link === 'restaurant' ? "Escolha o restaurante..." : "Escolha a categoria..."}
                                                        className="pl-9 rounded-xl shadow-sm border-orange-200"
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto border rounded-xl p-1 bg-muted/30">
                                                    {filteredResults.length > 0 ? (
                                                        filteredResults.map(item => (
                                                            <div 
                                                                key={item.id}
                                                                onClick={() => {
                                                                    setNovoBanner({...novoBanner, link_id: item.id})
                                                                    setSearchTerm(item.nome)
                                                                }}
                                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                                                    novoBanner.link_id === item.id ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-muted'
                                                                }`}
                                                            >
                                                                {item.nome}
                                                                {novoBanner.link_id === item.id && <Check className="h-4 w-4" />}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-center py-4 text-xs text-muted-foreground">Nenhum resultado encontrado.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Seleção de Item (Apenas se restaurante selecionado) */}
                                        {novoBanner.tipo_link === 'restaurant' && novoBanner.link_id && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-4 border-l-4 border-orange-500 pl-4 py-2 bg-orange-50/30 rounded-r-xl">
                                                <Label className="text-xs font-bold text-orange-700 flex items-center gap-1 uppercase tracking-wider">
                                                    <ShoppingBag className="h-3 w-3" />
                                                    Ir direto para um produto desse restaurante? (Opcional)
                                                </Label>
                                                
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Buscar produto/promo..."
                                                        className="pl-9 h-9 text-xs rounded-xl bg-white border-orange-100"
                                                        value={itemSearchTerm}
                                                        onChange={e => setItemSearchTerm(e.target.value)}
                                                    />
                                                    {novoBanner.item_id && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-red-400 hover:text-red-600 hover:bg-transparent"
                                                            onClick={() => {
                                                                setNovoBanner({...novoBanner, item_id: null})
                                                                setItemSearchTerm("")
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 gap-0.5 max-h-32 overflow-y-auto border rounded-xl p-1 bg-white">
                                                    {filteredItems.length > 0 ? (
                                                        filteredItems.map(item => (
                                                            <div 
                                                                key={item.id}
                                                                onClick={() => {
                                                                    setNovoBanner({...novoBanner, item_id: item.id})
                                                                    setItemSearchTerm(item.nome)
                                                                }}
                                                                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-[12px] transition-colors ${
                                                                    novoBanner.item_id === item.id ? 'bg-orange-600 text-white font-bold' : 'hover:bg-orange-50'
                                                                }`}
                                                            >
                                                                {item.nome}
                                                                {novoBanner.item_id === item.id && <Check className="h-3 w-3" />}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-center py-2 text-[10px] text-muted-foreground">Nenhum produto encontrado neste restaurante.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <Label className="font-bold flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-orange-600" />
                                        Regras de Tempo (Opcional)
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Aparecer às</span>
                                            <Input 
                                                type="time" 
                                                className="rounded-xl"
                                                value={novoBanner.horario_inicio}
                                                onChange={e => setNovoBanner({...novoBanner, horario_inicio: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Sumir às</span>
                                            <Input 
                                                type="time" 
                                                className="rounded-xl"
                                                value={novoBanner.horario_fim}
                                                onChange={e => setNovoBanner({...novoBanner, horario_fim: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button 
                                        type="submit" 
                                        disabled={isSubmitting || ( (novoBanner.tipo_link === 'restaurant' || novoBanner.tipo_link === 'category') && !novoBanner.link_id )} 
                                        className="bg-orange-600 hover:bg-orange-700 text-white w-full font-bold h-12 rounded-2xl shadow-lg ring-offset-2 transition-all active:scale-95"
                                    >
                                        {isSubmitting ? "Semeando Promoção..." : editingId ? "🚀 Salvar Alterações Ninja" : "🚀 Criar Banner Ninja"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent className="px-0 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-32 text-center animate-pulse flex flex-col items-center gap-4">
                            <RefreshCw className="h-10 w-10 animate-spin text-orange-500" />
                            <p className="font-bold text-lg italic">Invocando seus banners...</p>
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="col-span-full py-32 text-center border-2 border-dashed border-muted rounded-[40px] flex flex-col items-center justify-center gap-4 group">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-bold text-xl text-muted-foreground">O deserto promocional...</p>
                                <p className="text-sm text-muted-foreground/60">Sua vitrine está vazia.</p>
                            </div>
                            <Button variant="outline" className="mt-2 rounded-full px-8" onClick={() => handleOpenDialog()}>Começar Agora</Button>
                        </div>
                    ) : (
                        banners.map((banner) => (
                            <Card key={banner.id} className="overflow-hidden border-2 border-border shadow-md hover:shadow-xl transition-all duration-300 rounded-[32px] group relative">
                                <div className={`h-28 ${banner.cor_fundo} flex items-center justify-center text-5xl transform group-hover:scale-110 transition-transform duration-500`}>
                                    {banner.emoji}
                                </div>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h3 className="font-black truncate text-xl uppercase tracking-tight">{banner.titulo}</h3>
                                        <Badge className={`rounded-full shadow-sm ${banner.ativo ? "bg-green-100 text-green-700 pointer-events-none" : "bg-zinc-100 text-zinc-500"}`}>
                                            {banner.ativo ? "NO AR" : "PAUSADO"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-6 leading-tight">{banner.subtitulo || "Promoção ninja sem subtítulo"}</p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-6 h-7">
                                        {banner.horario_inicio && (
                                            <Badge variant="outline" className="flex items-center gap-1 font-bold bg-orange-50 text-orange-700 border-orange-200">
                                                <Clock className="h-3 w-3" />
                                                {banner.horario_inicio} • {banner.horario_fim}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[10px]">
                                            URL: {banner.tipo_link}
                                        </Badge>
                                        {banner.item_id && (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold uppercase text-[10px]">
                                                DIRETO AO PRODUTO
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button 
                                            variant={banner.ativo ? "outline" : "default"}
                                            className="flex-1 rounded-2xl font-bold transition-all active:scale-95"
                                            onClick={() => toggleStatus(banner.id, banner.ativo)}
                                        >
                                            {banner.ativo ? "Pausar" : "Ativar"}
                                        </Button>
                                        
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="text-orange-500 hover:bg-orange-50 border-orange-200 rounded-xl"
                                            onClick={() => handleOpenDialog(banner)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                            onClick={() => deleteBanner(banner.id)}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
