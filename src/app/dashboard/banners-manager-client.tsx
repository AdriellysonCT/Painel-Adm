"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
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
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    ArrowRight,
    Check,
    Clock,
    ImageIcon,
    Layout,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShoppingBag,
    Sparkles,
    Trash2,
    Upload,
    X,
} from "lucide-react"

type MediaType = "emoji" | "image"
type TextAnimation = "slide-up" | "fade-scale" | "lift-reveal"
type MediaAnimation = "float" | "pulse" | "wiggle" | "drift"

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
    tipo_midia?: MediaType | null
    imagem_url?: string | null
    animacao_texto?: TextAnimation | null
    animacao_midia?: MediaAnimation | null
    media_scale?: number | null
    media_offset_x?: number | null
    media_offset_y?: number | null
    intensidade_animacao?: number | null
}

type Entity = {
    id: string
    nome: string
}

type BannerDraft = {
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
    horario_inicio: string
    horario_fim: string
    tipo_midia: MediaType
    imagem_url: string
    animacao_texto: TextAnimation
    animacao_midia: MediaAnimation
    media_scale: number
    media_offset_x: number
    media_offset_y: number
    intensidade_animacao: number
}

type BannerTheme = {
    value: string
    label: string
    eyebrow: string
    gradient: string
    orb: string
    chip: string
    button: string
    pattern: string
    indicator: string
}

const EMOJI_OPTIONS = ["\uD83C\uDF55", "\uD83C\uDF54", "\uD83C\uDF5F", "\uD83C\uDF2D", "\uD83C\uDF63", "\uD83C\uDF5C", "\uD83C\uDF5D", "\uD83E\uDD57", "\uD83C\uDF57", "\uD83C\uDF2E", "\uD83C\uDF70", "\uD83E\uDD64", "\uD83C\uDF81", "\uD83D\uDD25", "\uD83D\uDE80", "\u26A1", "\uD83D\uDC8E", "\uD83D\uDED2", "\uD83D\uDECD\uFE0F", "\uD83C\uDFE0"]

const TEXT_ANIMATIONS: { value: TextAnimation; label: string; description: string }[] = [
    { value: "slide-up", label: "Subida suave", description: "Texto entra de baixo com impacto suave." },
    { value: "fade-scale", label: "Fade com zoom", description: "Texto surge com leve zoom premium." },
    { value: "lift-reveal", label: "Revelação em camadas", description: "Texto sobe com sensação de camadas." },
]

const MEDIA_ANIMATIONS: { value: MediaAnimation; label: string; description: string }[] = [
    { value: "float", label: "Flutuar", description: "Movimento flutuante elegante." },
    { value: "pulse", label: "Pulso", description: "Batida suave com brilho." },
    { value: "wiggle", label: "Balanço", description: "Leve oscilação com energia." },
    { value: "drift", label: "Deslizar", description: "Deslize lateral cinematográfico." },
]

const BANNER_THEMES: BannerTheme[] = [
    { value: "orange", label: "Laranja Ninja (Premium)", gradient: "linear-gradient(135deg, #fb923c 0%, #f97316 22%, #ef4444 68%, #7c2d12 100%)", pattern: "rgba(255, 255, 255, 0.18)", orb: "radial-gradient(circle, #fb923c, transparent)", button: "bg-white text-orange-600 hover:bg-orange-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Destaque", indicator: "from-orange-200 via-white to-red-200" },
    { value: "red", label: "Brasa Intensa", gradient: "linear-gradient(140deg, #991b1b 0%, #dc2626 35%, #ef4444 64%, #7f1d1d 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #fca5a5, transparent)", button: "bg-white text-red-700 hover:bg-red-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Urgente", indicator: "from-rose-200 via-white to-red-300" },
    { value: "emerald", label: "Verde Fresh", gradient: "linear-gradient(140deg, #064e3b 0%, #059669 32%, #10b981 62%, #022c22 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #6ee7b7, transparent)", button: "bg-white text-emerald-700 hover:bg-emerald-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Saudável", indicator: "from-emerald-200 via-white to-teal-200" },
    { value: "blue", label: "Céu Noturno", gradient: "linear-gradient(140deg, #1d4ed8 0%, #2563eb 32%, #0ea5e9 66%, #082f49 100%)", pattern: "rgba(255, 255, 255, 0.18)", orb: "radial-gradient(circle, #7dd3fc, transparent)", button: "bg-white text-blue-700 hover:bg-sky-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Novidade", indicator: "from-sky-200 via-white to-blue-200" },
    { value: "purple", label: "Místico Premium", gradient: "linear-gradient(140deg, #581c87 0%, #7e22ce 34%, #a855f7 68%, #1e1b4b 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #d8b4fe, transparent)", button: "bg-white text-purple-700 hover:bg-purple-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Exclusivo", indicator: "from-fuchsia-200 via-white to-violet-200" },
    { value: "zinc", label: "Dark Stealth", gradient: "linear-gradient(140deg, #09090b 0%, #18181b 28%, #27272a 55%, #3f3f46 100%)", pattern: "rgba(255, 255, 255, 0.12)", orb: "radial-gradient(circle, #a1a1aa, transparent)", button: "bg-white text-zinc-900 hover:bg-zinc-100", chip: "border-white/15 bg-white/5 text-white/80", eyebrow: "Especial", indicator: "from-zinc-200 via-white to-amber-100" },
]

const INITIAL_BANNER_STATE: BannerDraft = {
    titulo: "",
    subtitulo: "",
    cor_fundo: "orange",
    emoji: "\uD83D\uDD25",
    botao_texto: "Pedir agora",
    tipo_link: "home",
    link_id: "",
    item_id: null,
    ativo: true,
    ordem: 0,
    horario_inicio: "",
    horario_fim: "",
    tipo_midia: "emoji",
    imagem_url: "",
    animacao_texto: "slide-up",
    animacao_midia: "float",
    media_scale: 1,
    media_offset_x: 0,
    media_offset_y: 0,
    intensidade_animacao: 1,
}

function resolveTheme(themeValue: string) {
    return BANNER_THEMES.find((theme) => theme.value === themeValue) ?? BANNER_THEMES[0]
}

function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function normalizeBannerDraft(draft: BannerDraft) {
    return {
        ...draft,
        horario_inicio: draft.horario_inicio || "",
        horario_fim: draft.horario_fim || "",
        botao_texto: draft.botao_texto.trim() || "Pedir agora",
        ordem: Number.isFinite(Number(draft.ordem)) ? Number(draft.ordem) : 0,
        imagem_url: draft.imagem_url || "",
        media_scale: clampNumber(Number(draft.media_scale) || 1, 0.45, 2.4),
        media_offset_x: clampNumber(Number(draft.media_offset_x) || 0, -140, 140),
        media_offset_y: clampNumber(Number(draft.media_offset_y) || 0, -120, 140),
        intensidade_animacao: clampNumber(Number(draft.intensidade_animacao) || 1, 0.2, 4),
    }
}

function getDestinationLabel(tipoLink: string) {
    switch (tipoLink) {
        case "restaurant":
            return "Abre restaurante"
        case "category":
            return "Abre categoria"
        case "coupons":
            return "Vai para cupons"
        default:
            return "Vai para início"
    }
}

async function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result)
                return
            }
            reject(new Error("Arquivo inválido"))
        }
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem"))
        reader.readAsDataURL(file)
    })
}

function getTextMotion(animation: TextAnimation, intensity: number = 1): any {
    const bezel = [0.22, 1, 0.36, 1] as any
    const durationMultiplier = 1 / Math.max(0.2, intensity)

    switch (animation) {
        case "fade-scale":
            return {
                initial: { opacity: 0, scale: 1 - (0.08 * intensity) },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.8 * durationMultiplier, ease: bezel },
            }
        case "lift-reveal":
            return {
                initial: { opacity: 0, y: 20 * intensity, scale: 1 - (0.03 * intensity) },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.9 * durationMultiplier, ease: bezel },
            }
        default:
            return {
                initial: { opacity: 0, y: 28 * intensity },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.72 * durationMultiplier, ease: bezel },
            }
    }
}

function getMediaMotion(animation: MediaAnimation, intensity: number = 1): any {
    const durationMultiplier = 1 / Math.max(0.2, intensity)

    switch (animation) {
        case "pulse":
            return {
                animate: {
                    scale: [1, 1 + (0.04 * intensity), 1],
                    opacity: [1, 1 - (0.08 * intensity), 1]
                },
                transition: {
                    duration: 3.2 * durationMultiplier,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut"
                } as any,
            }
        case "wiggle":
            return {
                animate: { rotate: [0, 2 * intensity, -2 * intensity, 0] },
                transition: {
                    duration: 3.8 * durationMultiplier,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut"
                } as any,
            }
        case "drift":
            return {
                animate: {
                    x: [0, 10 * intensity, 0],
                    y: [0, -4 * intensity, 0]
                },
                transition: {
                    duration: 5.4 * durationMultiplier,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut"
                } as any,
            }
        default:
            return {
                animate: {
                    y: [0, -12 * intensity, -6 * intensity, -14 * intensity, 0],
                    rotate: [-4 * intensity, 3 * intensity, 6 * intensity, -2 * intensity, -4 * intensity],
                    scale: [1, 1 + (0.05 * intensity), 1 + (0.02 * intensity), 1 - (0.02 * intensity), 1]
                },
                transition: {
                    duration: 4.8 * durationMultiplier,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut"
                } as any,
            }
    }
}

function BannerShowcase({
    banner,
    compact = false,
    editable = false,
    onMediaPositionChange,
}: {
    banner: BannerDraft & { eyebrow?: string }
    compact?: boolean
    editable?: boolean
    onMediaPositionChange?: (x: number, y: number) => void
}) {
    const theme = resolveTheme(banner.cor_fundo)
    const intensity = banner.intensidade_animacao ?? 1
    const eyebrow = banner.eyebrow || theme.eyebrow
    const textMotion = getTextMotion(banner.animacao_texto, intensity)
    const mediaMotion = getMediaMotion(banner.animacao_midia, intensity)
    const mediaKey = `${banner.tipo_midia}-${banner.imagem_url}-${banner.emoji}-${banner.animacao_midia}`
    const textKey = `${banner.titulo}-${banner.subtitulo}-${banner.animacao_texto}`
    const isImageMedia = banner.tipo_midia === "image" && !!banner.imagem_url
    const mediaScale = banner.media_scale ?? 1
    const mediaOffsetX = banner.media_offset_x ?? 0
    const mediaOffsetY = banner.media_offset_y ?? 0
    const imageSize = compact ? 150 : 178

    return (
        <div
            className={`relative overflow-hidden rounded-[32px] border border-white/15 text-white shadow-2xl ${compact ? "min-h-[248px]" : "min-h-[280px]"}`}
            style={{ backgroundImage: theme.gradient }}
        >
            <div
                className="absolute inset-0 opacity-70"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.pattern} 1px, transparent 0)`,
                    backgroundSize: compact ? "28px 28px" : "32px 32px",
                }}
            />
            <motion.div
                className="absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl"
                style={{ background: theme.orb }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }}
                transition={{ duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/15 blur-3xl"
                animate={{ x: ["-10%", "340%"] }}
                transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.6, ease: "easeInOut" }}
            />

            <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-xl sm:bottom-5">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="relative overflow-hidden rounded-full border transition-all duration-500"
                        style={{
                            height: "5px",
                            minHeight: "5px",
                            maxHeight: "5px",
                            width: i === 0 ? "32px" : "5px",
                            minWidth: i === 0 ? "32px" : "5px",
                            maxWidth: i === 0 ? "32px" : "5px",
                            borderColor: i === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)",
                            backgroundColor: i === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)",
                        }}
                    >
                        {i === 0 && <div className={`absolute inset-0 rounded-full bg-linear-to-r opacity-80 ${theme.indicator}`} />}
                    </div>
                ))}
            </div>

            <div className={`relative z-10 grid min-h-[260px] items-center gap-6 p-5 pt-8 pb-24 sm:min-h-[320px] sm:grid-cols-[minmax(0,1fr)_170px] sm:gap-5 sm:p-7 sm:pt-20 sm:pb-20 md:grid-cols-[minmax(0,1.08fr)_210px] md:gap-7 lg:min-h-[360px] lg:grid-cols-[minmax(0,1.15fr)_260px] lg:gap-10 lg:p-9 lg:pt-20 lg:pb-20`}>
                <motion.div key={textKey} className={`space-y-4`} {...textMotion}>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`rounded-full border backdrop-blur-md px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.chip}`}>{eyebrow}</Badge>
                        {!banner.ativo && <Badge className="rounded-full border border-white/20 bg-black/20 text-white px-2 py-0.5 text-[10px]">Pausado</Badge>}
                    </div>
                    <div className="space-y-2">
                        <h3 className={`font-black leading-[0.95] tracking-tight ${compact ? "text-[1.75rem]" : "text-[2.15rem]"}`}>
                            {banner.titulo || "Pizza em dobro!"}
                        </h3>
                        <p className={`max-w-sm text-white/86 ${compact ? "text-xs" : "text-sm"}`}>
                            {banner.subtitulo || "Texto curto, objetivo e com ritmo de campanha."}
                        </p>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex">
                        <button type="button" className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold shadow-xl transition-colors ${theme.button}`}>
                            {banner.botao_texto || "Pedir agora"}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                </motion.div>

                <div className="pointer-events-none absolute bottom-6 right-2 flex items-end justify-end scale-[0.85] origin-bottom-right sm:static sm:flex-none sm:scale-100 sm:items-center sm:justify-center lg:justify-end">
                    <div className="relative">
                        {isImageMedia ? (
                            <motion.div
                                className={`relative ${editable ? "cursor-grab active:cursor-grabbing pointer-events-auto" : ""}`}
                                drag={editable}
                                dragMomentum={false}
                                dragElastic={0.08}
                                dragConstraints={{ left: -120, right: 120, top: -120, bottom: 140 }}
                                onDragEnd={(_, info) => {
                                    if (!onMediaPositionChange) return
                                    onMediaPositionChange(
                                        clampNumber(mediaOffsetX + info.offset.x, -140, 140),
                                        clampNumber(mediaOffsetY + info.offset.y, -120, 140),
                                    )
                                }}
                                style={{
                                    width: imageSize,
                                    height: imageSize,
                                    x: mediaOffsetX,
                                    y: mediaOffsetY,
                                    scale: mediaScale,
                                }}
                            >
                                <div className="absolute inset-[14%] rounded-full blur-3xl opacity-60" style={{ background: theme.orb }} />
                                <motion.div key={mediaKey} className="relative h-full w-full" {...mediaMotion}>
                                    <Image
                                        src={banner.imagem_url}
                                        alt={banner.titulo || "Banner"}
                                        fill
                                        sizes={compact ? "150px" : "178px"}
                                        className="object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,0.28)]"
                                        unoptimized
                                    />
                                </motion.div>
                                {editable && (
                                    <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/25 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm whitespace-nowrap">
                                        Arraste a arte
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key={mediaKey}
                                className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 backdrop-blur-sm ${compact ? "h-24 w-24" : "h-28 w-28"}`}
                                {...mediaMotion}
                            >
                                <motion.div
                                    className="absolute inset-3 rounded-full bg-white/18 blur-xl"
                                    animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.92, 1.08, 0.92] }}
                                    transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } as any}
                                />
                                <span className={`relative z-10 ${compact ? "text-4xl" : "text-5xl"}`}>{banner.emoji || "\uD83D\uDD25"}</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function BannersManagerClient() {
    const [banners, setBanners] = useState<Banner[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [restaurants, setRestaurants] = useState<Entity[]>([])
    const [categories, setCategories] = useState<Entity[]>([])
    const [items, setItems] = useState<Entity[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [itemSearchTerm, setItemSearchTerm] = useState("")
    const [novoBanner, setNovoBanner] = useState<BannerDraft>(INITIAL_BANNER_STATE)

    useEffect(() => {
        fetchBanners()
        fetchEntities()
    }, [])

    useEffect(() => {
        if (novoBanner.tipo_link === "restaurant" && novoBanner.link_id) {
            fetchItems(novoBanner.link_id)
            return
        }

        setItems([])
        setItemSearchTerm("")
        setNovoBanner((prev) => ({ ...prev, item_id: null }))
    }, [novoBanner.link_id, novoBanner.tipo_link])

    useEffect(() => {
        if (!editingId || !novoBanner.item_id || items.length === 0) return

        const item = items.find((currentItem) => currentItem.id === novoBanner.item_id)
        if (item) setItemSearchTerm(item.nome)
    }, [editingId, items, novoBanner.item_id])

    const fetchBanners = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase.from("banners_promocionais").select("*").order("ordem", { ascending: true })
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
            const { data: restData } = await supabase.from("restaurantes_app").select("id, nome_fantasia, tipo_restaurante").order("nome_fantasia")
            if (restData) setRestaurants(restData.map((restaurant) => ({ id: restaurant.id, nome: restaurant.nome_fantasia })))

            const categoriesSet = new Set<string>()
            restData?.forEach((restaurant) => {
                if (restaurant.tipo_restaurante) categoriesSet.add(restaurant.tipo_restaurante)
            })

            const { data: itemCategories } = await supabase.from("itens_cardapio").select("categoria")
            itemCategories?.forEach((itemCategory) => {
                if (itemCategory.categoria) categoriesSet.add(itemCategory.categoria)
            })
            setCategories(Array.from(categoriesSet).sort().map((category) => ({ id: category, nome: category })))
        } catch (error) {
            console.error("Erro ao buscar entidades:", error)
        }
    }

    const fetchItems = async (restaurantId: string) => {
        try {
            const { data, error } = await supabase.from("itens_cardapio").select("id, nome").eq("id_restaurante", restaurantId).order("nome")
            if (error) throw error
            setItems(data?.map((item) => ({ id: item.id, nome: item.nome })) || [])
        } catch (error) {
            console.error("Erro ao buscar itens:", error)
        }
    }

    const resetDialog = () => {
        setEditingId(null)
        setNovoBanner(INITIAL_BANNER_STATE)
        setSearchTerm("")
        setItemSearchTerm("")
        setItems([])
    }

    const handleDialogChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) resetDialog()
    }
    const handleOpenDialog = (banner?: Banner) => {
        if (!banner) {
            resetDialog()
            setIsDialogOpen(true)
            return
        }

        setEditingId(banner.id)
        setNovoBanner({
            titulo: banner.titulo,
            subtitulo: banner.subtitulo || "",
            cor_fundo: banner.cor_fundo,
            emoji: banner.emoji,
            botao_texto: banner.botao_texto || "Pedir agora",
            tipo_link: banner.tipo_link,
            link_id: banner.link_id || "",
            item_id: banner.item_id,
            ativo: banner.ativo,
            ordem: banner.ordem,
            horario_inicio: banner.horario_inicio || "",
            horario_fim: banner.horario_fim || "",
            tipo_midia: banner.tipo_midia || "emoji",
            imagem_url: banner.imagem_url || "",
            animacao_texto: banner.animacao_texto || "slide-up",
            animacao_midia: banner.animacao_midia || "float",
            media_scale: banner.media_scale ?? 1,
            media_offset_x: banner.media_offset_x ?? 0,
            media_offset_y: banner.media_offset_y ?? 0,
                                 intensidade_animacao: (banner as any).intensidade_animacao ?? 1,
            intensidade_animacao: banner.intensidade_animacao ?? 1,
        })

        if (banner.tipo_link === "restaurant") {
            const restaurant = restaurants.find((currentRestaurant) => currentRestaurant.id === banner.link_id)
            setSearchTerm(restaurant?.nome || "")
            if (banner.link_id) fetchItems(banner.link_id)
        } else if (banner.tipo_link === "category") {
            const category = categories.find((currentCategory) => currentCategory.id === banner.link_id)
            setSearchTerm(category?.nome || banner.link_id || "")
        } else {
            setSearchTerm("")
        }

        setIsDialogOpen(true)
    }

    const handleSaveBanner = async (event: React.FormEvent) => {
        event.preventDefault()
        try {
            setIsSubmitting(true)

            const payload = normalizeBannerDraft(novoBanner)
            const basePayload = {
                titulo: payload.titulo,
                subtitulo: payload.subtitulo,
                cor_fundo: payload.cor_fundo,
                emoji: payload.emoji,
                botao_texto: payload.botao_texto,
                tipo_link: payload.tipo_link,
                link_id: payload.link_id,
                item_id: payload.item_id,
                ativo: payload.ativo,
                ordem: payload.ordem,
                horario_inicio: payload.horario_inicio || null,
                horario_fim: payload.horario_fim || null,
            }
            const mediaPayload = {
                ...basePayload,
                tipo_midia: payload.tipo_midia,
                imagem_url: payload.tipo_midia === "image" ? payload.imagem_url || null : null,
                animacao_texto: payload.animacao_texto,
                animacao_midia: payload.animacao_midia,
            }
            const fullPayload = {
                ...mediaPayload,
                media_scale: payload.tipo_midia === "image" ? payload.media_scale : 1,
                media_offset_x: payload.tipo_midia === "image" ? payload.media_offset_x : 0,
                media_offset_y: payload.tipo_midia === "image" ? payload.media_offset_y : 0,
                intensidade_animacao: payload.intensidade_animacao,
            }

            const runSave = async (savePayload: typeof fullPayload | typeof mediaPayload | typeof basePayload) => {
                if (editingId) {
                    const { error } = await supabase.from("banners_promocionais").update(savePayload).eq("id", editingId)
                    if (error) throw error
                    return
                }

                const { error } = await supabase.from("banners_promocionais").insert([savePayload])
                if (error) throw error
            }

            const getSupabaseErrorMessage = (error: unknown) => {
                if (error instanceof Error && error.message) return error.message
                if (error && typeof error === "object") {
                    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
                    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
                }
                return String(error)
            }

            const isSchemaMismatch = (message: string) => {
                const normalized = message.toLowerCase()
                return normalized.includes("column") || normalized.includes("schema cache") || normalized.includes("pgrst") || normalized.includes("could not find")
            }

            let saveNotice = ""

            try {
                await runSave(fullPayload)
            } catch (firstError) {
                const firstMessage = getSupabaseErrorMessage(firstError)
                if (!isSchemaMismatch(firstMessage)) throw new Error(firstMessage)

                try {
                    await runSave(mediaPayload)
                    saveNotice = "Banner salvo, mas a posição e a escala da arte ainda não foram persistidas. Rode a migration 003 no Supabase."
                } catch (secondError) {
                    const secondMessage = getSupabaseErrorMessage(secondError)
                    if (!isSchemaMismatch(secondMessage)) throw new Error(secondMessage)

                    await runSave(basePayload)
                    saveNotice = "Banner salvo no modo básico. Rode as migrations 002 e 003 no Supabase para liberar imagem e animações personalizadas."
                }
            }

            handleDialogChange(false)
            fetchBanners()
            if (saveNotice) {
                alert(saveNotice)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : (error && typeof error === "object" ? JSON.stringify(error) : "Erro desconhecido")
            alert("Erro ao salvar banner: " + message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from("banners_promocionais").update({ ativo: !currentStatus }).eq("id", id)
            if (error) throw error
            fetchBanners()
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro desconhecido"
            alert("Erro ao atualizar status: " + message)
        }
    }

    const deleteBanner = async (id: string) => {
        if (!confirm("Excluir este banner permanentemente?")) return
        try {
            const { error } = await supabase.from("banners_promocionais").delete().eq("id", id)
            if (error) throw error
            fetchBanners()
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro desconhecido"
            alert("Erro ao excluir banner: " + message)
        }
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.size > 1024 * 1024 * 1.5) {
            alert("Escolha uma imagem com até 1,5 MB para não pesar o banner.")
            event.target.value = ""
            return
        }

        try {
            const dataUrl = await fileToDataUrl(file)
            setNovoBanner((prev) => ({ ...prev, tipo_midia: "image", imagem_url: dataUrl, media_scale: 1, media_offset_x: 0, media_offset_y: 0 }))
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao carregar imagem"
            alert(message)
        } finally {
            event.target.value = ""
        }
    }

    const filteredResults = useMemo(() => {
        const normalizedSearch = searchTerm.toLowerCase()
        if (novoBanner.tipo_link === "restaurant") {
            return restaurants.filter((restaurant) => restaurant.nome.toLowerCase().includes(normalizedSearch))
        }
        if (novoBanner.tipo_link === "category") {
            return categories.filter((category) => category.nome.toLowerCase().includes(normalizedSearch))
        }
        return []
    }, [categories, novoBanner.tipo_link, restaurants, searchTerm])

    const filteredItems = useMemo(() => {
        const normalizedSearch = itemSearchTerm.toLowerCase()
        return items.filter((item) => item.nome.toLowerCase().includes(normalizedSearch))
    }, [itemSearchTerm, items])

    const destinationSummary = useMemo(() => {
        if (novoBanner.tipo_link === "restaurant") {
            const restaurant = restaurants.find((currentRestaurant) => currentRestaurant.id === novoBanner.link_id)
            if (!restaurant) return "Selecione um restaurante"
            const item = items.find((currentItem) => currentItem.id === novoBanner.item_id)
            return item ? `${restaurant.nome} • item ${item.nome}` : restaurant.nome
        }
        if (novoBanner.tipo_link === "category") {
            const category = categories.find((currentCategory) => currentCategory.id === novoBanner.link_id)
            return category?.nome || "Selecione uma categoria"
        }
        return getDestinationLabel(novoBanner.tipo_link)
    }, [categories, items, novoBanner.item_id, novoBanner.link_id, novoBanner.tipo_link, restaurants])

    return (
        <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
                            <Sparkles className="h-3.5 w-3.5" /> Estúdio de banners
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black tracking-tight">Banners com mídia customizada e animações</CardTitle>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                Agora o admin pode alternar entre emoji e imagem local, escolher animações e ajustar a arte quase como ela ficará no cliente.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={fetchBanners} disabled={loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Sincronizar
                        </Button>
                        <Button className="bg-orange-600 text-white shadow-lg hover:bg-orange-700" onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" /> Novo banner
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-8 px-0 pt-6">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[32px] border border-border/60 bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Preview da linguagem visual</h3>
                                <p className="text-sm text-muted-foreground">Simulação do banner final com mídia e animações escolhidas.</p>
                            </div>
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">Referência para o app do cliente</Badge>
                        </div>

                        <BannerShowcase banner={{ ...normalizeBannerDraft(novoBanner), titulo: novoBanner.titulo || "Pizza em dobro!", subtitulo: novoBanner.subtitulo || "Compre 1 e leve outra pequena com visual muito mais vivo.", botao_texto: novoBanner.botao_texto || "Pedir agora", ativo: novoBanner.ativo, eyebrow: destinationSummary }} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                        <Card className="rounded-[28px] border border-border/60 bg-card/70 shadow-sm">
                            <CardContent className="space-y-3 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">O que entrou agora</p>
                                <div className="grid gap-2 text-sm">
                                    <div className="rounded-2xl bg-muted/60 px-4 py-3">Upload de imagem local para substituir o emoji</div>
                                    <div className="rounded-2xl bg-muted/60 px-4 py-3">Animação separada para texto e mídia</div>
                                    <div className="rounded-2xl bg-muted/60 px-4 py-3">Preview com arraste e escala da arte</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[28px] border border-border/60 bg-card/70 shadow-sm">
                            <CardContent className="space-y-3 p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Campos do banner</p>
                                <div className="flex flex-wrap gap-2">
                                    {["tipo_midia", "imagem_url", "animacao_texto", "animacao_midia", "botao_texto", "ordem"].map((field) => (
                                        <Badge key={field} variant="outline" className="rounded-full px-3 py-1">{field}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                    <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[32px] sm:max-w-[980px]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight">
                                {editingId ? "Editar banner premium" : "Criar banner premium"}
                            </DialogTitle>
                            <DialogDescription>
                                Ajuste texto, botão, mídia, animações, destino e regras de tempo.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSaveBanner} className="space-y-8">
                            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="titulo-banner">Título principal</Label>
                                            <Input id="titulo-banner" placeholder="Ex: Pizza em Dobro!" value={novoBanner.titulo} onChange={(event) => setNovoBanner((prev) => ({ ...prev, titulo: event.target.value }))} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cta-banner">Texto do botão</Label>
                                            <Input id="cta-banner" placeholder="Ex: Pedir agora" value={novoBanner.botao_texto} onChange={(event) => setNovoBanner((prev) => ({ ...prev, botao_texto: event.target.value }))} required />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="subtitulo-banner">{"Subt\u00edtulo"}</Label>
                                        <Input id="subtitulo-banner" placeholder="Ex: Compre 1 e leve outra pequena" value={novoBanner.subtitulo} onChange={(event) => setNovoBanner((prev) => ({ ...prev, subtitulo: event.target.value }))} />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                                        <div className="space-y-2">
                                            <Label>{"Visual do banner"}</Label>
                                            <Select value={novoBanner.cor_fundo} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, cor_fundo: value }))}>
                                                <SelectTrigger><SelectValue placeholder={"Selecione o visual do card"} /></SelectTrigger>
                                                <SelectContent>{BANNER_THEMES.map((theme) => <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ordem-banner">{"Ordem"}</Label>
                                            <Input id="ordem-banner" type="number" min="0" value={novoBanner.ordem} onChange={(event) => setNovoBanner((prev) => ({ ...prev, ordem: Number(event.target.value || 0) }))} />
                                        </div>
                                    </div>

                                    <div className="space-y-4 rounded-[28px] border border-border/70 bg-muted/20 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label className="text-sm font-bold">{"M\u00eddia principal do banner"}</Label>
                                            <Badge variant="outline">{"Escolha emoji ou imagem"}</Badge>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <button type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, tipo_midia: "emoji" }))} className={`rounded-2xl border px-4 py-3 text-left transition-colors ${novoBanner.tipo_midia === "emoji" ? "border-orange-500 bg-orange-50" : "border-border bg-background hover:bg-muted/40"}`}>
                                                <div className="font-semibold">Usar emoji</div>
                                                <p className="text-sm text-muted-foreground">Mantém o ícone leve e rápido.</p>
                                            </button>
                                            <button type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, tipo_midia: "image" }))} className={`rounded-2xl border px-4 py-3 text-left transition-colors ${novoBanner.tipo_midia === "image" ? "border-orange-500 bg-orange-50" : "border-border bg-background hover:bg-muted/40"}`}>
                                                <div className="font-semibold">Usar imagem</div>
                                                <p className="text-sm text-muted-foreground">Faz upload local e usa arte própria.</p>
                                            </button>
                                        </div>

                                        {novoBanner.tipo_midia === "emoji" ? (
                                            <div className="space-y-2">
                                                <Label>{"\u00cdcone em emoji"}</Label>
                                                <div className="flex flex-wrap gap-2 rounded-[24px] border bg-background p-3">
                                                    {EMOJI_OPTIONS.map((emoji) => (
                                                        <button key={emoji} type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, emoji }))} className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-all hover:scale-110 active:scale-95 ${novoBanner.emoji === emoji ? "bg-orange-600 text-white shadow-lg" : "bg-white hover:bg-orange-50"}`}>{emoji}</button>
                                                    ))}
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{"Outro"}</span>
                                                        <Input className="h-11 w-16 rounded-2xl text-center text-xl" value={novoBanner.emoji} maxLength={4} onChange={(event) => setNovoBanner((prev) => ({ ...prev, emoji: event.target.value }))} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <Label>{"Imagem local"}</Label>
                                                <div className="flex flex-col gap-3 rounded-[24px] border bg-background p-4">
                                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-4 py-5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100">
                                                        <Upload className="h-4 w-4" />
                                                        {"Escolher imagem do computador"}
                                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleImageUpload} />
                                                    </label>
                                                    <p className="text-xs text-muted-foreground">{"Melhor para logos e \u00edcones de at\u00e9 1,5 MB. A imagem ser\u00e1 salva no banner para o cliente renderizar."}</p>
                                                    {novoBanner.imagem_url ? (
                                                        <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-3">
                                                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-sm"><Image src={novoBanner.imagem_url} alt={"Preview da m\u00eddia"} fill sizes="64px" className="object-cover" unoptimized /></div>
                                                            <div className="flex-1 text-sm text-muted-foreground">{"Imagem pronta para substituir o emoji no banner."}</div>
                                                            <Button type="button" variant="ghost" size="icon" className="rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => setNovoBanner((prev) => ({ ...prev, imagem_url: "", tipo_midia: "emoji" }))}><X className="h-4 w-4" /></Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground"><ImageIcon className="h-4 w-4" />{"Nenhuma imagem selecionada ainda."}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                            <Label>Animação do texto</Label>
                                            <Select value={novoBanner.animacao_texto} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, animacao_texto: value as TextAnimation }))}>
                                                <SelectTrigger><SelectValue placeholder="Escolha a animação" /></SelectTrigger>
                                                <SelectContent>{TEXT_ANIMATIONS.map((animation) => <SelectItem key={animation.value} value={animation.value}>{animation.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">{TEXT_ANIMATIONS.find((item) => item.value === novoBanner.animacao_texto)?.description}</p>
                                        </div>
                                        <div className="space-y-2 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                            <Label>Animação da mídia</Label>
                                            <Select value={novoBanner.animacao_midia} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, animacao_midia: value as MediaAnimation }))}>
                                                <SelectTrigger><SelectValue placeholder="Escolha a animação" /></SelectTrigger>
                                                <SelectContent>{MEDIA_ANIMATIONS.map((animation) => <SelectItem key={animation.value} value={animation.value}>{animation.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">{MEDIA_ANIMATIONS.find((item) => item.value === novoBanner.animacao_midia)?.description}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 rounded-[24px] border border-orange-200 bg-orange-50/40 p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <Label className="flex items-center gap-2 text-sm font-bold text-orange-900">
                                                    <Sparkles className="h-4 w-4" /> Intensidade da animação
                                                </Label>
                                                <p className="text-xs text-orange-800/70">Aumente para movimentos mais rápidos e amplos.</p>
                                            </div>
                                            <Badge variant="outline" className="border-orange-200 bg-white text-orange-700">
                                                {novoBanner.intensidade_animacao.toFixed(1)}x
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-orange-400">SOFT</span>
                                            <input
                                                type="range"
                                                min="0.2"
                                                max="4"
                                                step="0.1"
                                                value={novoBanner.intensidade_animacao}
                                                onChange={(event) => setNovoBanner((prev) => ({ ...prev, intensidade_animacao: Number(event.target.value) }))}
                                                className="h-2 w-full appearance-none rounded-lg bg-orange-200 accent-orange-600"
                                            />
                                            <span className="text-[10px] font-bold text-orange-700">EXTREME</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t pt-6">
                                        <Label className="flex items-center gap-2 text-sm font-bold"><Layout className="h-4 w-4 text-orange-600" />Ação ao clicar</Label>
                                        <div className="space-y-3">
                                            <Select value={novoBanner.tipo_link} onValueChange={(value) => { setNovoBanner((prev) => ({ ...prev, tipo_link: value, link_id: "", item_id: null })); setSearchTerm(""); setItemSearchTerm("") }}>
                                                <SelectTrigger><SelectValue placeholder={"Escolha o destino"} /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="home">Ir para início</SelectItem>
                                                    <SelectItem value="restaurant">Abrir restaurante</SelectItem>
                                                    <SelectItem value="category">Abrir categoria</SelectItem>
                                                    <SelectItem value="coupons">Ir para cupons</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {(novoBanner.tipo_link === "restaurant" || novoBanner.tipo_link === "category") && (
                                                <div className="space-y-2 rounded-[24px] border bg-muted/20 p-3">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                        <Input placeholder={novoBanner.tipo_link === "restaurant" ? "Busque um restaurante" : "Busque uma categoria"} className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                                                    </div>

                                                    <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border bg-background p-1">
                                                        {filteredResults.length > 0 ? filteredResults.map((entity) => (
                                                            <button key={entity.id} type="button" onClick={() => { setNovoBanner((prev) => ({ ...prev, link_id: entity.id })); setSearchTerm(entity.nome) }} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${novoBanner.link_id === entity.id ? "bg-orange-100 font-bold text-orange-700" : "hover:bg-muted"}`}>
                                                                <span>{entity.nome}</span>
                                                                {novoBanner.link_id === entity.id && <Check className="h-4 w-4" />}
                                                            </button>
                                                        )) : <p className="py-4 text-center text-xs text-muted-foreground">{"Nenhum resultado encontrado."}</p>}
                                                    </div>
                                                </div>
                                            )}

                                            {novoBanner.tipo_link === "restaurant" && novoBanner.link_id && (
                                                <div className="space-y-2 rounded-[24px] border border-orange-200 bg-orange-50/60 p-4">
                                                    <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700"><ShoppingBag className="h-3.5 w-3.5" />{"Direto para um item do restaurante"}</Label>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                        <Input placeholder={"Buscar produto ou combo"} className="pl-9" value={itemSearchTerm} onChange={(event) => setItemSearchTerm(event.target.value)} />
                                                        {novoBanner.item_id && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-red-500 hover:bg-transparent hover:text-red-700" onClick={() => { setNovoBanner((prev) => ({ ...prev, item_id: null })); setItemSearchTerm("") }}><X className="h-4 w-4" /></Button>}
                                                    </div>
                                                    <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border bg-white p-1">
                                                        {filteredItems.length > 0 ? filteredItems.map((item) => (
                                                            <button key={item.id} type="button" onClick={() => { setNovoBanner((prev) => ({ ...prev, item_id: item.id })); setItemSearchTerm(item.nome) }} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${novoBanner.item_id === item.id ? "bg-orange-600 font-bold text-white" : "hover:bg-orange-50"}`}>
                                                                <span>{item.nome}</span>
                                                                {novoBanner.item_id === item.id && <Check className="h-4 w-4" />}
                                                            </button>
                                                        )) : <p className="py-4 text-center text-xs text-muted-foreground">{"Nenhum item encontrado nesse restaurante."}</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t pt-6">
                                        <Label className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-orange-600" />{"Regras de tempo"}</Label>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="horario-inicio" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{"Mostrar \u00e0s"}</Label>
                                                <Input id="horario-inicio" type="time" value={novoBanner.horario_inicio} onChange={(event) => setNovoBanner((prev) => ({ ...prev, horario_inicio: event.target.value }))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="horario-fim" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{"Esconder \u00e0s"}</Label>
                                                <Input id="horario-fim" type="time" value={novoBanner.horario_fim} onChange={(event) => setNovoBanner((prev) => ({ ...prev, horario_fim: event.target.value }))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-[28px] border bg-muted/20 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{"Preview ao vivo"}</p>
                                            {novoBanner.tipo_midia === "image" && <Badge variant="outline">{"Imagem livre, sem c\u00edrculo"}</Badge>}
                                        </div>
                                        <BannerShowcase
                                            banner={{ ...normalizeBannerDraft(novoBanner), titulo: novoBanner.titulo || "Pizza em dobro!", subtitulo: novoBanner.subtitulo || "Compre 1 e leve outra pequena com sensação de campanha premium.", botao_texto: novoBanner.botao_texto || "Pedir agora", ativo: novoBanner.ativo, eyebrow: destinationSummary }}
                                            compact
                                            editable={novoBanner.tipo_midia === "image"}
                                            onMediaPositionChange={(x, y) => setNovoBanner((prev) => ({ ...prev, media_offset_x: x, media_offset_y: y }))}
                                        />

                                        {novoBanner.tipo_midia === "image" && novoBanner.imagem_url && (
                                            <div className="mt-4 space-y-4 rounded-[24px] border border-orange-200 bg-orange-50/70 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-orange-900">{"Editor r\u00e1pido da arte"}</p>
                                                        <p className="text-xs text-orange-800/80">{"Arraste a imagem no preview e ajuste o tamanho aqui at\u00e9 ficar do jeito certo."}</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="rounded-2xl border-orange-200 bg-white/80 text-orange-700 hover:bg-white"
                                                        onClick={() => setNovoBanner((prev) => ({ ...prev, media_scale: 1, media_offset_x: 0, media_offset_y: 0 }))}
                                                    >
                                                        {"Resetar arte"}
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-orange-800">
                                                        <span>{"Escala da imagem"}</span>
                                                        <span>{novoBanner.media_scale.toFixed(2)}x</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0.45"
                                                        max="2.4"
                                                        step="0.05"
                                                        value={novoBanner.media_scale}
                                                        onChange={(event) => setNovoBanner((prev) => ({ ...prev, media_scale: Number(event.target.value) }))}
                                                        className="w-full accent-orange-600"
                                                    />
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-orange-900">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700/80">Posição X</div>
                                                        <div className="mt-1 font-semibold">{Math.round(novoBanner.media_offset_x)} px</div>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-orange-900">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700/80">Posição Y</div>
                                                        <div className="mt-1 font-semibold">{Math.round(novoBanner.media_offset_y)} px</div>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-orange-900">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700/80">Animação</div>
                                                        <div className="mt-1 font-semibold">{MEDIA_ANIMATIONS.find((item) => item.value === novoBanner.animacao_midia)?.label}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Card className="rounded-[28px] border border-border/60 shadow-none">
                                        <CardContent className="space-y-3 p-5 text-sm">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{"Resumo do banner"}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">{"Visual: "}{resolveTheme(novoBanner.cor_fundo).label}</Badge>
                                                <Badge variant="outline">{"M\u00eddia: "}{novoBanner.tipo_midia === "image" ? "Imagem" : "Emoji"}</Badge>
                                                <Badge variant="outline">{"Texto: "}{novoBanner.animacao_texto}</Badge>
                                                <Badge variant="outline">{"M\u00eddia: "}{novoBanner.animacao_midia}</Badge>
                                                {novoBanner.tipo_midia === "image" && <Badge variant="outline">{"Escala: "}{novoBanner.media_scale.toFixed(2)}x</Badge>}
                                                <Badge variant="outline">{"Ordem: "}{novoBanner.ordem}</Badge>
                                            </div>
                                            <div className="rounded-2xl bg-muted/60 p-4 text-muted-foreground">{destinationSummary}</div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="submit" disabled={isSubmitting || ((novoBanner.tipo_link === "restaurant" || novoBanner.tipo_link === "category") && !novoBanner.link_id) || (novoBanner.tipo_midia === "image" && !novoBanner.imagem_url)} className="h-12 w-full rounded-2xl bg-orange-600 text-base font-bold text-white shadow-lg hover:bg-orange-700">
                                    {isSubmitting ? "Salvando visual..." : editingId ? "Salvar alterações" : "Criar banner"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full flex flex-col items-center gap-4 py-28 text-center"><RefreshCw className="h-10 w-10 animate-spin text-orange-500" /><p className="text-lg font-bold italic">Carregando vitrine...</p></div>
                    ) : banners.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-[40px] border-2 border-dashed border-muted py-28 text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><Plus className="h-10 w-10 text-muted-foreground" /></div>
                            <div><p className="text-xl font-bold text-muted-foreground">{"Sua vitrine ainda est\u00e1 vazia"}</p><p className="text-sm text-muted-foreground/70">{"Crie o primeiro banner com m\u00eddia customizada e anima\u00e7\u00f5es."}</p></div>
                            <Button variant="outline" className="rounded-full px-8" onClick={() => handleOpenDialog()}>{"Come\u00e7ar agora"}</Button>
                        </div>
                    ) : (
                        banners.map((banner, index) => {
                            const hydratedBanner: BannerDraft = {
                                titulo: banner.titulo,
                                subtitulo: banner.subtitulo || "",
                                cor_fundo: banner.cor_fundo,
                                emoji: banner.emoji,
                                botao_texto: banner.botao_texto || "Pedir agora",
                                tipo_link: banner.tipo_link,
                                link_id: banner.link_id || "",
                                item_id: banner.item_id,
                                ativo: banner.ativo,
                                ordem: banner.ordem,
                                horario_inicio: banner.horario_inicio || "",
                                horario_fim: banner.horario_fim || "",
                                tipo_midia: banner.tipo_midia || "emoji",
                                imagem_url: banner.imagem_url || "",
                                animacao_texto: banner.animacao_texto || "slide-up",
                                animacao_midia: banner.animacao_midia || "float",
                                media_scale: banner.media_scale ?? 1,
                                media_offset_x: banner.media_offset_x ?? 0,
                                media_offset_y: banner.media_offset_y ?? 0,
                                 intensidade_animacao: (banner as any).intensidade_animacao ?? 1,
                            }

                            return (
                                <motion.div key={banner.id} initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, delay: index * 0.05 }}>
                                    <Card className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                        <CardContent className="space-y-5 p-4">
                                            <BannerShowcase banner={hydratedBanner} compact />
                                            <div className="space-y-4 px-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge className={banner.ativo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}>{banner.ativo ? "No ar" : "Pausado"}</Badge>
                                                    <Badge variant="outline">Ordem {banner.ordem}</Badge>
                                                    <Badge variant="outline">{getDestinationLabel(banner.tipo_link)}</Badge>
                                                    <Badge variant="outline">{hydratedBanner.tipo_midia === "image" ? "Imagem" : "Emoji"}</Badge>
                                                    {banner.item_id && <Badge variant="outline">Direto ao item</Badge>}
                                                </div>
                                                <div className="grid gap-2 text-sm text-muted-foreground">
                                                    <div className="rounded-2xl bg-muted/50 px-4 py-3">Botão: <span className="font-semibold text-foreground">{banner.botao_texto || "Pedir agora"}</span></div>
                                                    <div className="rounded-2xl bg-muted/50 px-4 py-3">Texto: {hydratedBanner.animacao_texto} • Mídia: {hydratedBanner.animacao_midia}{hydratedBanner.tipo_midia === "image" ? ` • Escala ${hydratedBanner.media_scale?.toFixed(2)}x` : ""}</div>
                                                    {banner.horario_inicio && <div className="rounded-2xl bg-muted/50 px-4 py-3">Janela ativa: {banner.horario_inicio} - {banner.horario_fim || "23:59"}</div>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant={banner.ativo ? "outline" : "default"} className="flex-1 rounded-2xl font-bold" onClick={() => toggleStatus(banner.id, banner.ativo)}>{banner.ativo ? "Pausar" : "Ativar"}</Button>
                                                    <Button variant="outline" size="icon" className="rounded-2xl border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => handleOpenDialog(banner)}><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="rounded-2xl text-zinc-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteBanner(banner.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}





