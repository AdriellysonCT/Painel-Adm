"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
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
import BannerCropDialog from "./banner-crop-dialog"

type MediaType = "emoji" | "image" | "banner_pronto"
type TextAnimation = "slide-up" | "slide-down" | "fade-scale" | "fade-in" | "scale-in" | "blur-in" | "flip-up" | "lift-reveal" | "stagger-reveal" | "bounce"
type MediaAnimation = "float" | "pulse" | "wiggle" | "drift"
type LayoutType = "text-left" | "text-right" | "centered" | "split" | "hero" | "card-bottom"
type FontPreset = "impact" | "elegant" | "playful" | "modern" | "retro" | "luxury" | "festive"
type BadgeText = "none" | "NOVO" | "PROMOÇÃO" | "LIMITADO" | "FRETE GRÁTIS" | "EXCLUSIVO" | "LANÇAMENTO" | "APROVEITE" | "BEST SELLER" | "DESCONTO"
type BadgePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right"
type ButtonStyle = "pill" | "rounded" | "sharp"
type CornerRadius = "soft" | "rounded" | "xl" | "full"
type TextAnimationType = "entrance" | "continuous"
type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"

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
    layout_type?: string | null
    font_preset?: string | null
    badge_text?: string | null
    badge_position?: string | null
    button_style?: string | null
    corner_radius?: string | null
    overlay_opacity?: number | null
    animacao_texto_tipo?: string | null
    intensidade_animacao_texto?: number | null
    logo_url?: string | null
    logo_position?: string | null
    media_focal_x?: number | null
    media_focal_y?: number | null
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
    layout_type: LayoutType
    font_preset: FontPreset
    badge_text: BadgeText | string
    badge_position: BadgePosition
    button_style: ButtonStyle
    corner_radius: CornerRadius
    overlay_opacity: number
    animacao_texto_tipo: TextAnimationType
    intensidade_animacao_texto: number
    logo_url: string
    logo_position: LogoPosition
    media_focal_x: number
    media_focal_y: number
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
    { value: "slide-down", label: "Descida elegante", description: "Texto desliza de cima com sofisticação." },
    { value: "fade-scale", label: "Fade com zoom", description: "Texto surge com leve zoom premium." },
    { value: "fade-in", label: "Fade simples", description: "Transição suave de opacidade." },
    { value: "scale-in", label: "Zoom suave", description: "Texto cresce do centro elegantemente." },
    { value: "blur-in", label: "Desfoque para foco", description: "Texto sai do desfoque com estilo." },
    { value: "flip-up", label: "Giro 3D", description: "Rotação tridimensional impactante." },
    { value: "lift-reveal", label: "Revelação em camadas", description: "Texto sobe com sensação de camadas." },
    { value: "stagger-reveal", label: "Ondulação progressiva", description: "Palavras entram em sequência." },
    { value: "bounce", label: "Bounce divertido", description: "Texto quicando com energia." },
]

const MEDIA_ANIMATIONS: { value: MediaAnimation; label: string; description: string }[] = [
    { value: "float", label: "Flutuar", description: "Movimento flutuante elegante." },
    { value: "pulse", label: "Pulso", description: "Batida suave com brilho." },
    { value: "wiggle", label: "Balanço", description: "Leve oscilação com energia." },
    { value: "drift", label: "Deslizar", description: "Deslize lateral cinematográfico." },
]

const TEXT_ANIMATION_TYPES: { value: TextAnimationType; label: string; description: string }[] = [
    { value: "entrance", label: "Na entrada", description: "Animação acontece uma vez ao aparecer." },
    { value: "continuous", label: "Durante o card", description: "Animação em loop infinito." },
]

const LAYOUT_OPTIONS: { value: LayoutType; label: string; icon: string; description: string }[] = [
    { value: "text-left", label: "Texto à esquerda", icon: "◧", description: "Mídia à direita, texto à esquerda — clássico." },
    { value: "text-right", label: "Texto à direita", icon: "◨", description: "Mídia à esquerda, texto à direita — invertido." },
    { value: "centered", label: "Centralizado", icon: "⊞", description: "Tudo centralizado com mídia ao fundo e overlay escuro." },
    { value: "split", label: "Dividido (50/50)", icon: "◫", description: "Mídia e texto lado a lado, cada um ocupando metade." },
    { value: "hero", label: "Herói (fundo total)", icon: "▣", description: "Imagem ocupa o fundo inteiro com texto sobreposto e overlay." },
    { value: "card-bottom", label: "Card inferior", icon: "▤", description: "Mídia ocupa topo, texto e CTA na parte inferior." },
]

const FONT_PRESETS: { value: FontPreset; label: string; description: string; headingClass: string; bodyClass: string }[] = [
    { value: "impact", label: "Impacto", description: "Fontes grossas e chamativas.", headingClass: "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase", bodyClass: "text-xs sm:text-sm font-bold uppercase tracking-wider" },
    { value: "elegant", label: "Elegante", description: "Serifa fina e sofisticada.", headingClass: "text-2xl sm:text-3xl lg:text-4xl font-light italic tracking-wide", bodyClass: "text-xs sm:text-sm font-normal italic" },
    { value: "playful", label: "Divertido", description: "Arredondado e amigável.", headingClass: "text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-normal", bodyClass: "text-xs sm:text-sm font-semibold" },
    { value: "modern", label: "Moderno", description: "Limpo e geométrico.", headingClass: "text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight", bodyClass: "text-xs sm:text-sm font-medium" },
    { value: "retro", label: "Retrô", description: "Estilo vintage com tracking aberto.", headingClass: "text-3xl sm:text-4xl lg:text-5xl font-black tracking-[0.15em] uppercase", bodyClass: "text-xs sm:text-sm font-bold uppercase tracking-[0.1em]" },
    { value: "luxury", label: "Luxo", description: "Fino, leve e espaçado.", headingClass: "text-2xl sm:text-3xl lg:text-4xl font-thin tracking-[0.2em] uppercase", bodyClass: "text-xs sm:text-sm font-light tracking-widest uppercase" },
    { value: "festive", label: "Festivo", description: "Black lowercase com personalidade.", headingClass: "text-3xl sm:text-4xl lg:text-5xl font-black lowercase tracking-tight", bodyClass: "text-xs sm:text-sm font-bold lowercase" },
]

const BADGE_OPTIONS: { value: BadgeText | string; label: string; color: string }[] = [
    { value: "none", label: "Sem badge", color: "bg-transparent text-transparent" },
    { value: "NOVO", label: "NOVO", color: "bg-emerald-500 text-white" },
    { value: "PROMOÇÃO", label: "PROMOÇÃO", color: "bg-orange-500 text-white" },
    { value: "LIMITADO", label: "LIMITADO", color: "bg-rose-600 text-white" },
    { value: "FRETE GRÁTIS", label: "FRETE GRÁTIS", color: "bg-sky-500 text-white" },
    { value: "EXCLUSIVO", label: "EXCLUSIVO", color: "bg-violet-600 text-white" },
    { value: "LANÇAMENTO", label: "LANÇAMENTO", color: "bg-amber-500 text-white" },
    { value: "APROVEITE", label: "APROVEITE", color: "bg-pink-500 text-white" },
    { value: "BEST SELLER", label: "BEST SELLER", color: "bg-yellow-500 text-black" },
    { value: "DESCONTO", label: "DESCONTO", color: "bg-red-600 text-white" },
]

const BADGE_POSITIONS: { value: BadgePosition; label: string }[] = [
    { value: "top-left", label: "Sup. esquerdo" },
    { value: "top-right", label: "Sup. direito" },
    { value: "bottom-left", label: "Inf. esquerdo" },
    { value: "bottom-right", label: "Inf. direito" },
]

const BUTTON_STYLES: { value: ButtonStyle; label: string; className: string }[] = [
    { value: "pill", label: "Pílula", className: "rounded-full" },
    { value: "rounded", label: "Arredondado", className: "rounded-xl" },
    { value: "sharp", label: "Reto", className: "rounded-md" },
]

const CORNER_RADIUS_OPTIONS: { value: CornerRadius; label: string; className: string }[] = [
    { value: "soft", label: "Suave", className: "rounded-xl" },
    { value: "rounded", label: "Padrão", className: "rounded-[32px]" },
    { value: "xl", label: "Arredondado", className: "rounded-[48px]" },
    { value: "full", label: "Total", className: "rounded-[64px]" },
]

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
    { value: "top-left", label: "Canto sup. esq." },
    { value: "top-right", label: "Canto sup. dir." },
    { value: "bottom-left", label: "Canto inf. esq." },
    { value: "bottom-right", label: "Canto inf. dir." },
    { value: "center", label: "Centro" },
]

const BANNER_THEMES: BannerTheme[] = [
    { value: "orange", label: "Laranja Ninja (Premium)", gradient: "linear-gradient(135deg, #fb923c 0%, #f97316 22%, #ef4444 68%, #7c2d12 100%)", pattern: "rgba(255, 255, 255, 0.18)", orb: "radial-gradient(circle, #fb923c, transparent)", button: "bg-white text-orange-600 hover:bg-orange-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Destaque", indicator: "from-orange-200 via-white to-red-200" },
    { value: "red", label: "Brasa Intensa", gradient: "linear-gradient(140deg, #991b1b 0%, #dc2626 35%, #ef4444 64%, #7f1d1d 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #fca5a5, transparent)", button: "bg-white text-red-700 hover:bg-red-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Urgente", indicator: "from-rose-200 via-white to-red-300" },
    { value: "emerald", label: "Verde Fresh", gradient: "linear-gradient(140deg, #064e3b 0%, #059669 32%, #10b981 62%, #022c22 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #6ee7b7, transparent)", button: "bg-white text-emerald-700 hover:bg-emerald-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Saudável", indicator: "from-emerald-200 via-white to-teal-200" },
    { value: "blue", label: "Céu Noturno", gradient: "linear-gradient(140deg, #1d4ed8 0%, #2563eb 32%, #0ea5e9 66%, #082f49 100%)", pattern: "rgba(255, 255, 255, 0.18)", orb: "radial-gradient(circle, #7dd3fc, transparent)", button: "bg-white text-blue-700 hover:bg-sky-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Novidade", indicator: "from-sky-200 via-white to-blue-200" },
    { value: "purple", label: "Místico Premium", gradient: "linear-gradient(140deg, #581c87 0%, #7e22ce 34%, #a855f7 68%, #1e1b4b 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #d8b4fe, transparent)", button: "bg-white text-purple-700 hover:bg-purple-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Exclusivo", indicator: "from-fuchsia-200 via-white to-violet-200" },
    { value: "zinc", label: "Dark Stealth", gradient: "linear-gradient(140deg, #09090b 0%, #18181b 28%, #27272a 55%, #3f3f46 100%)", pattern: "rgba(255, 255, 255, 0.12)", orb: "radial-gradient(circle, #a1a1aa, transparent)", button: "bg-white text-zinc-900 hover:bg-zinc-100", chip: "border-white/15 bg-white/5 text-white/80", eyebrow: "Especial", indicator: "from-zinc-200 via-white to-amber-100" },
    { value: "pink", label: "Pink Vibrante", gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 30%, #be185d 65%, #831843 100%)", pattern: "rgba(255, 255, 255, 0.16)", orb: "radial-gradient(circle, #fbcfe8, transparent)", button: "bg-white text-pink-700 hover:bg-pink-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Feminino", indicator: "from-pink-200 via-white to-rose-200" },
    { value: "petroleo", label: "Azul Petróleo", gradient: "linear-gradient(135deg, #0f766e 0%, #0d9488 28%, #14b8a6 60%, #115e59 100%)", pattern: "rgba(255, 255, 255, 0.18)", orb: "radial-gradient(circle, #99f6e4, transparent)", button: "bg-white text-teal-700 hover:bg-teal-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Exclusivo", indicator: "from-teal-200 via-white to-emerald-200" },
    { value: "rosegold", label: "Rose Gold", gradient: "linear-gradient(135deg, #fda4af 0%, #fb7185 25%, #e11d48 55%, #881337 100%)", pattern: "rgba(255, 255, 255, 0.2)", orb: "radial-gradient(circle, #fecdd3, transparent)", button: "bg-white text-rose-700 hover:bg-rose-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Premium", indicator: "from-rose-200 via-white to-pink-200" },
    { value: "indigo", label: "Índigo Noturno", gradient: "linear-gradient(135deg, #3730a3 0%, #4338ca 30%, #6366f1 60%, #1e1b4b 100%)", pattern: "rgba(255, 255, 255, 0.15)", orb: "radial-gradient(circle, #c7d2fe, transparent)", button: "bg-white text-indigo-700 hover:bg-indigo-50", chip: "border-white/20 bg-white/10 text-white", eyebrow: "Profissional", indicator: "from-indigo-200 via-white to-blue-200" },
    { value: "dourado", label: "Dourado Luxo", gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 28%, #fbbf24 58%, #b45309 100%)", pattern: "rgba(0, 0, 0, 0.12)", orb: "radial-gradient(circle, #fde68a, transparent)", button: "bg-black text-amber-300 hover:bg-amber-50 hover:text-amber-800", chip: "border-black/20 bg-black/10 text-black", eyebrow: "Luxo", indicator: "from-amber-200 via-white to-yellow-200" },
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
    layout_type: "text-left",
    font_preset: "impact",
    badge_text: "none",
    badge_position: "top-right",
    button_style: "pill",
    corner_radius: "rounded",
    overlay_opacity: 0.4,
    animacao_texto_tipo: "entrance",
    intensidade_animacao_texto: 1,
    logo_url: "",
    logo_position: "top-left",
    media_focal_x: 50,
    media_focal_y: 50,
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
        layout_type: (LAYOUT_OPTIONS.some(l => l.value === draft.layout_type) ? draft.layout_type : "text-left"),
        font_preset: (FONT_PRESETS.some(f => f.value === draft.font_preset) ? draft.font_preset : "impact"),
        badge_text: draft.badge_text || "none",
        badge_position: (BADGE_POSITIONS.some(p => p.value === draft.badge_position) ? draft.badge_position : "top-right"),
        button_style: (BUTTON_STYLES.some(s => s.value === draft.button_style) ? draft.button_style : "pill"),
        corner_radius: (CORNER_RADIUS_OPTIONS.some(r => r.value === draft.corner_radius) ? draft.corner_radius : "rounded"),
        overlay_opacity: clampNumber(Number(draft.overlay_opacity) ?? 0.4, 0.05, 0.85),
        animacao_texto_tipo: (TEXT_ANIMATION_TYPES.some(t => t.value === draft.animacao_texto_tipo) ? draft.animacao_texto_tipo : "entrance"),
        intensidade_animacao_texto: clampNumber(Number(draft.intensidade_animacao_texto) || 1, 0.2, 4),
        logo_url: draft.logo_url || "",
        logo_position: (LOGO_POSITIONS.some(p => p.value === draft.logo_position) ? draft.logo_position : "top-left"),
        media_focal_x: clampNumber(Number(draft.media_focal_x) ?? 50, 0, 100),
        media_focal_y: clampNumber(Number(draft.media_focal_y) ?? 50, 0, 100),
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
        case "slide-down":
            return {
                initial: { opacity: 0, y: -28 * intensity },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.72 * durationMultiplier, ease: bezel },
            }
        case "fade-in":
            return {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.6 * durationMultiplier, ease: bezel },
            }
        case "scale-in":
            return {
                initial: { opacity: 0, scale: 1 - (0.12 * intensity) },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.7 * durationMultiplier, ease: bezel },
            }
        case "blur-in":
            return {
                initial: { opacity: 0, filter: "blur(8px)" },
                animate: { opacity: 1, filter: "blur(0px)" },
                transition: { duration: 0.85 * durationMultiplier, ease: bezel },
            }
        case "flip-up":
            return {
                initial: { opacity: 0, rotateX: 35 * intensity, y: 15 * intensity },
                animate: { opacity: 1, rotateX: 0, y: 0 },
                transition: { duration: 0.9 * durationMultiplier, ease: bezel },
            }
        case "stagger-reveal":
            return {
                initial: { opacity: 0, y: 24 * intensity },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.8 * durationMultiplier, ease: bezel },
            }
        case "bounce":
            return {
                initial: { opacity: 0, y: 40 * intensity },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.9 * durationMultiplier, type: "spring" as any, stiffness: 180 * intensity, damping: 12 },
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
    const textIntensity = banner.intensidade_animacao_texto ?? 1
    const eyebrow = banner.eyebrow || theme.eyebrow
    const textMotion = getTextMotion(banner.animacao_texto, textIntensity)
    const mediaMotion = getMediaMotion(banner.animacao_midia, intensity)
    const mediaKey = `${banner.tipo_midia}-${banner.imagem_url}-${banner.emoji}-${banner.animacao_midia}`
    const textKey = `${banner.titulo}-${banner.subtitulo}-${banner.animacao_texto}`
    const isImageMedia = banner.tipo_midia === "image" && !!banner.imagem_url
    const mediaScale = banner.media_scale ?? 1
    const mediaOffsetX = banner.media_offset_x ?? 0
    const mediaOffsetY = banner.media_offset_y ?? 0
    const imageSize = compact ? 150 : 178
    const isContinuous = banner.animacao_texto_tipo === "continuous"

    const fontPreset = FONT_PRESETS.find(f => f.value === banner.font_preset) ?? FONT_PRESETS[0]
    const btnStyle = BUTTON_STYLES.find(s => s.value === banner.button_style) ?? BUTTON_STYLES[0]
    const crnr = CORNER_RADIUS_OPTIONS.find(r => r.value === banner.corner_radius) ?? CORNER_RADIUS_OPTIONS[1]
    const badgeConfig = BADGE_OPTIONS.find(b => b.value === banner.badge_text)

    const badgePosClasses: Record<string, string> = {
        "top-left": "top-3 left-3",
        "top-right": "top-3 right-3",
        "bottom-left": "bottom-3 left-3",
        "bottom-right": "bottom-3 right-3",
    }

    const logoPosClasses: Record<string, string> = {
        "top-left": "top-3 left-3",
        "top-right": "top-3 right-3",
        "bottom-left": "bottom-3 left-3",
        "bottom-right": "bottom-3 right-3",
        "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    }

    const renderMedia = () => {
        if (isImageMedia) {
            return (
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
            )
        }
        return (
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
        )
    }

    const logoEl = banner.logo_url ? (
        <img src={banner.logo_url} alt="logo" className={`absolute ${logoPosClasses[banner.logo_position] || "top-3 left-3"} w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg z-10`} />
    ) : null

    const textContent = (
        <motion.div key={textKey} className="space-y-3" {...textMotion}>
            <div className="flex flex-wrap items-center gap-2">
                <Badge className={`rounded-full border backdrop-blur-md px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.chip}`}>{eyebrow}</Badge>
                {!banner.ativo && <Badge className="rounded-full border border-white/20 bg-black/20 text-white px-2 py-0.5 text-[10px]">Pausado</Badge>}
            </div>
            <div className="space-y-2">
                <h3
                    className={`${fontPreset.headingClass} leading-[0.95] ${compact ? "text-[1.75rem]" : ""}`}
                    data-text-anim={isContinuous ? "continuous" : undefined}
                >
                    {banner.titulo || "Pizza em dobro!"}
                </h3>
                <p className={`max-w-sm text-white/86 ${fontPreset.bodyClass} ${compact ? "text-xs" : ""}`}>
                    {banner.subtitulo || "Texto curto, objetivo e com ritmo de campanha."}
                </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex">
                <button type="button" className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-bold shadow-xl transition-colors ${theme.button} ${btnStyle.className}`}>
                    {banner.botao_texto || "Pedir agora"}
                    <ArrowRight className="h-3.5 w-3.5" />
                </button>
            </motion.div>
        </motion.div>
    )

    if (banner.tipo_midia === "banner_pronto" && banner.imagem_url) {
        return (
            <div className={`relative overflow-hidden ${crnr.className} shadow-2xl ${compact ? "min-h-[248px]" : "min-h-[280px]"}`}>
                <Image src={banner.imagem_url} alt="Banner promocional" fill className="object-cover" sizes={compact ? "400px" : "600px"} unoptimized />
            </div>
        )
    }

    if (banner.layout_type === "hero" && isImageMedia) {
        return (
            <div className={`relative overflow-hidden ${crnr.className} h-48 sm:h-56 lg:h-64 text-white shadow-2xl`}>
                <img
                    src={banner.imagem_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: `${banner.media_focal_x ?? 50}% ${banner.media_focal_y ?? 50}%` }}
                />
                <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${banner.overlay_opacity ?? 0.4})` }} />
                {banner.badge_text !== "none" && badgeConfig && (
                    <span className={`absolute ${badgePosClasses[banner.badge_position] || "top-3 right-3"} z-20 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${badgeConfig.color}`}>
                        {banner.badge_text}
                    </span>
                )}
                {logoEl}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 text-white">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                        <Badge className="rounded-full border backdrop-blur-md px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] bg-white/20 text-white border-white/30">{eyebrow}</Badge>
                        {!banner.ativo && <Badge className="rounded-full border border-white/20 bg-black/20 text-white px-2 py-0.5 text-[10px]">Pausado</Badge>}
                    </div>
                    <h3 className={`${fontPreset.headingClass} text-white`} data-text-anim={isContinuous ? "continuous" : undefined}>
                        {banner.titulo || "Pizza em dobro!"}
                    </h3>
                    {banner.subtitulo && <p className={`max-w-md text-white/86 ${fontPreset.bodyClass}`}>{banner.subtitulo}</p>}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-3 inline-flex">
                        <button type="button" className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-bold shadow-lg text-white ${btnStyle.className} bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-colors`}>
                            {banner.botao_texto || "Pedir agora"}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                </div>
            </div>
        )
    }

    if (banner.layout_type === "centered") {
        return (
            <div
                className={`relative overflow-hidden ${crnr.className} text-white shadow-2xl ${compact ? "min-h-[248px]" : "min-h-[280px]"}`}
                style={{ background: theme.gradient }}
            >
                <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.pattern} 1px, transparent 0)`, backgroundSize: compact ? "28px 28px" : "32px 32px" }} />
                <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${banner.overlay_opacity ?? 0.4})` }} />
                <motion.div className="absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ background: theme.orb }} animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }} transition={{ duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }} />
                {banner.badge_text !== "none" && badgeConfig && (
                    <span className={`absolute ${badgePosClasses[banner.badge_position] || "top-3 right-3"} z-20 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${badgeConfig.color}`}>
                        {banner.badge_text}
                    </span>
                )}
                {logoEl}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                        <Badge className={`rounded-full border backdrop-blur-md px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.chip}`}>{eyebrow}</Badge>
                        {!banner.ativo && <Badge className="rounded-full border border-white/20 bg-black/20 text-white px-2 py-0.5 text-[10px]">Pausado</Badge>}
                    </div>
                    <h3 className={`${fontPreset.headingClass}`} data-text-anim={isContinuous ? "continuous" : undefined}>
                        {banner.titulo || "Pizza em dobro!"}
                    </h3>
                    {banner.subtitulo && <p className={`max-w-md text-white/86 ${fontPreset.bodyClass}`}>{banner.subtitulo}</p>}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-3 inline-flex">
                        <button type="button" className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-bold shadow-lg ${theme.button} ${btnStyle.className}`}>
                            {banner.botao_texto || "Pedir agora"}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                </div>
                <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-xl sm:bottom-5">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="relative overflow-hidden rounded-full border transition-all duration-500" style={{ height: "5px", minHeight: "5px", maxHeight: "5px", width: i === 0 ? "32px" : "5px", minWidth: i === 0 ? "32px" : "5px", maxWidth: i === 0 ? "32px" : "5px", borderColor: i === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", backgroundColor: i === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)" }}>
                            {i === 0 && <div className={`absolute inset-0 rounded-full bg-linear-to-r opacity-80 ${theme.indicator}`} />}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (banner.layout_type === "card-bottom" && isImageMedia) {
        return (
            <div className={`relative overflow-hidden ${crnr.className} text-white shadow-2xl ${compact ? "min-h-[248px]" : "min-h-[280px]"}`} style={{ background: theme.gradient }}>
                <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.pattern} 1px, transparent 0)`, backgroundSize: compact ? "28px 28px" : "32px 32px" }} />
                <motion.div className="absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ background: theme.orb }} animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }} transition={{ duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }} />
                {banner.badge_text !== "none" && badgeConfig && (
                    <span className={`absolute ${badgePosClasses[banner.badge_position] || "top-3 right-3"} z-20 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${badgeConfig.color}`}>
                        {banner.badge_text}
                    </span>
                )}
                {logoEl}
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36">
                            <motion.div className="absolute inset-[14%] rounded-full blur-3xl opacity-60" style={{ background: theme.orb }} />
                            <motion.div key={mediaKey} className="relative h-full w-full" {...mediaMotion}>
                                <Image src={banner.imagem_url} alt={banner.titulo || "Banner"} fill sizes={compact ? "112px" : "144px"} className="object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,0.28)]" unoptimized />
                            </motion.div>
                        </div>
                    </div>
                    <div className="p-4 pt-0">
                        <motion.div key={textKey} {...textMotion} className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`rounded-full border backdrop-blur-md px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.chip}`}>{eyebrow}</Badge>
                            </div>
                            <h3 className={`${fontPreset.headingClass} text-sm sm:text-base`} data-text-anim={isContinuous ? "continuous" : undefined}>
                                {banner.titulo || "Pizza em dobro!"}
                            </h3>
                            <p className={`text-white/86 text-xs ${fontPreset.bodyClass}`}>{banner.subtitulo || "Texto curto, objetivo e com ritmo de campanha."}</p>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex mt-1">
                                <button type="button" className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold shadow-xl transition-colors ${theme.button} ${btnStyle.className}`}>
                                    {banner.botao_texto || "Pedir agora"}
                                    <ArrowRight className="h-3 w-3" />
                                </button>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    if (banner.layout_type === "split" && isImageMedia) {
        return (
            <div className={`relative overflow-hidden ${crnr.className} text-white shadow-2xl ${compact ? "min-h-[248px]" : "min-h-[280px]"} flex`} style={{ background: theme.gradient }}>
                <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.pattern} 1px, transparent 0)`, backgroundSize: compact ? "28px 28px" : "32px 32px" }} />
                <motion.div className="absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ background: theme.orb }} animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }} transition={{ duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }} />
                {banner.badge_text !== "none" && badgeConfig && (
                    <span className={`absolute ${badgePosClasses[banner.badge_position] || "top-3 right-3"} z-20 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${badgeConfig.color}`}>
                        {banner.badge_text}
                    </span>
                )}
                {logoEl}
                <div className="relative z-10 flex w-1/2 items-center overflow-hidden bg-black/20">
                    <motion.div key={mediaKey} className="relative w-full h-full min-h-[160px]" {...mediaMotion}>
                        <Image src={banner.imagem_url} alt={banner.titulo || "Banner"} fill className="object-cover" sizes="50vw" unoptimized />
                    </motion.div>
                </div>
                <div className="relative z-10 flex w-1/2 items-center p-4">
                    <motion.div key={textKey} {...textMotion} className="space-y-2">
                        <Badge className={`rounded-full border backdrop-blur-md px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.chip}`}>{eyebrow}</Badge>
                        <h3 className={`${fontPreset.headingClass} text-sm sm:text-base`} data-text-anim={isContinuous ? "continuous" : undefined}>
                            {banner.titulo || "Pizza em dobro!"}
                        </h3>
                        <p className={`text-white/86 text-xs ${fontPreset.bodyClass}`}>{banner.subtitulo || "Texto curto, objetivo e com ritmo de campanha."}</p>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex mt-1">
                            <button type="button" className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold shadow-xl transition-colors ${theme.button} ${btnStyle.className}`}>
                                {banner.botao_texto || "Pedir agora"}
                                <ArrowRight className="h-3 w-3" />
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        )
    }

    const isTextRight = banner.layout_type === "text-right"
    return (
        <div
            className={`relative overflow-hidden ${crnr.className} border border-white/15 text-white shadow-2xl ${compact ? "min-h-[248px]" : "min-h-[280px]"}`}
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

            <div className={`relative z-10 flex ${isTextRight ? "flex-row-reverse" : ""} items-center w-full h-full min-h-[260px] sm:min-h-[320px] lg:min-h-[360px] px-5 py-4 gap-4 sm:px-7 sm:py-6 lg:px-9 lg:py-8`}>
                <div className="flex-1 min-w-0">
                    {banner.badge_text !== "none" && banner.layout_type !== "hero" && badgeConfig && (
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider mb-2 ${badgeConfig.color}`}>
                            {banner.badge_text}
                        </span>
                    )}
                    {textContent}
                </div>
                <div className="flex-shrink-0 pointer-events-none absolute bottom-6 right-2 flex items-end justify-end scale-[0.85] origin-bottom-right sm:static sm:flex-none sm:scale-100 sm:items-center sm:justify-center lg:justify-end">
                    <div className="relative">
                        {renderMedia()}
                    </div>
                </div>
            </div>

            {logoEl}
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
    const [cropFile, setCropFile] = useState<File | null>(null)
    const [isUploadingStorage, setIsUploadingStorage] = useState(false)

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
            intensidade_animacao: banner.intensidade_animacao ?? 1,
            layout_type: (banner as any).layout_type || "text-left",
            font_preset: (banner as any).font_preset || "impact",
            badge_text: (banner as any).badge_text || "none",
            badge_position: (banner as any).badge_position || "top-right",
            button_style: (banner as any).button_style || "pill",
            corner_radius: (banner as any).corner_radius || "rounded",
            overlay_opacity: (banner as any).overlay_opacity ?? 0.4,
            animacao_texto_tipo: (banner as any).animacao_texto_tipo || "entrance",
            intensidade_animacao_texto: (banner as any).intensidade_animacao_texto ?? 1,
            logo_url: (banner as any).logo_url || "",
            logo_position: (banner as any).logo_position || "top-left",
            media_focal_x: (banner as any).media_focal_x ?? 50,
            media_focal_y: (banner as any).media_focal_y ?? 50,
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
            const hasMedia = payload.tipo_midia === "image" || payload.tipo_midia === "banner_pronto"
            const mediaPayload = {
                ...basePayload,
                tipo_midia: payload.tipo_midia,
                imagem_url: hasMedia ? payload.imagem_url || null : null,
                animacao_texto: payload.animacao_texto,
                animacao_midia: payload.animacao_midia,
            }
            const fullPayload = {
                ...mediaPayload,
                media_scale: payload.tipo_midia === "image" ? payload.media_scale : 1,
                media_offset_x: payload.tipo_midia === "image" ? payload.media_offset_x : 0,
                media_offset_y: payload.tipo_midia === "image" ? payload.media_offset_y : 0,
                intensidade_animacao: payload.intensidade_animacao,
                layout_type: payload.layout_type,
                font_preset: payload.font_preset,
                badge_text: payload.badge_text === "none" ? null : payload.badge_text,
                badge_position: payload.badge_text === "none" ? null : payload.badge_position,
                button_style: payload.button_style,
                corner_radius: payload.corner_radius,
                overlay_opacity: payload.overlay_opacity,
                animacao_texto_tipo: payload.animacao_texto_tipo,
                intensidade_animacao_texto: payload.intensidade_animacao_texto,
                logo_url: payload.logo_url || null,
                logo_position: payload.logo_position,
                media_focal_x: payload.layout_type === "hero" ? payload.media_focal_x : 50,
                media_focal_y: payload.layout_type === "hero" ? payload.media_focal_y : 50,
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

        if (file.size > 2 * 1024 * 1024) {
            alert("Escolha uma imagem com até 2 MB.")
            event.target.value = ""
            return
        }

        setCropFile(file)
        event.target.value = ""
    }

    const handleCropConfirm = useCallback(async (croppedBlob: Blob) => {
        if (!cropFile) return
        setIsUploadingStorage(true)
        try {
            const formData = new FormData()
            const ext = cropFile.name.split(".").pop() || "webp"
            const filename = `banner-${Date.now()}.${ext}`
            formData.append("file", croppedBlob, filename)

            const res = await fetch("/api/banners/upload", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Falha ao enviar imagem")
            }

            const { url } = await res.json()
            setNovoBanner((prev) => ({
                ...prev,
                tipo_midia: "image",
                imagem_url: url,
                media_scale: 1,
                media_offset_x: 0,
                media_offset_y: 0,
            }))
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao enviar imagem"
            alert("Erro ao enviar imagem: " + message)
        } finally {
            setIsUploadingStorage(false)
            setCropFile(null)
        }
    }, [cropFile])

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
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
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
                        <Button className="bg-[#2563eb] text-white shadow-lg hover:bg-[#1d4ed8]" onClick={() => handleOpenDialog()}>
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
                                    {novoBanner.tipo_midia !== "banner_pronto" && (
                                        <>
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

                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label>{"Visual do banner"}</Label>
                                                    <Select value={novoBanner.cor_fundo} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, cor_fundo: value }))}>
                                                        <SelectTrigger><SelectValue placeholder={"Selecione o visual do card"} /></SelectTrigger>
                                                        <SelectContent>{BANNER_THEMES.map((theme) => <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {novoBanner.tipo_midia !== "banner_pronto" ? (
                                            <div />
                                        ) : null}
                                        <div className="space-y-2">
                                            <Label htmlFor="ordem-banner">{"Ordem"}</Label>
                                            <Input id="ordem-banner" type="number" min="0" value={novoBanner.ordem} onChange={(event) => setNovoBanner((prev) => ({ ...prev, ordem: Number(event.target.value || 0) }))} />
                                        </div>
                                    </div>

                                    <div className="space-y-4 rounded-[28px] border border-border/70 bg-muted/20 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label className="text-sm font-bold">{"M\u00eddia principal do banner"}</Label>
                                            <Badge variant="outline">{novoBanner.tipo_midia === "banner_pronto" ? "Imagem completa, sem texto" : "Escolha emoji ou imagem"}</Badge>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-3">
                                            <button type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, tipo_midia: "emoji" }))} className={`rounded-2xl border px-4 py-3 text-left transition-colors ${novoBanner.tipo_midia === "emoji" ? "border-[#2563eb] bg-blue-50" : "border-border bg-background hover:bg-muted/40"}`}>
                                                <div className="font-semibold">Usar emoji</div>
                                                <p className="text-sm text-muted-foreground">Mantém o ícone leve e rápido.</p>
                                            </button>
                                            <button type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, tipo_midia: "image" }))} className={`rounded-2xl border px-4 py-3 text-left transition-colors ${novoBanner.tipo_midia === "image" ? "border-[#2563eb] bg-blue-50" : "border-border bg-background hover:bg-muted/40"}`}>
                                                <div className="font-semibold">Usar imagem</div>
                                                <p className="text-sm text-muted-foreground">Faz upload local e usa arte própria.</p>
                                            </button>
                                            <button type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, tipo_midia: "banner_pronto" }))} className={`rounded-2xl border px-4 py-3 text-left transition-colors ${novoBanner.tipo_midia === "banner_pronto" ? "border-[#2563eb] bg-blue-50" : "border-border bg-background hover:bg-muted/40"}`}>
                                                <div className="font-semibold">Usar banner pronto</div>
                                                <p className="text-sm text-muted-foreground">Imagem promocional completa (título, texto já inclusos).</p>
                                            </button>
                                        </div>

                                        {novoBanner.tipo_midia === "emoji" ? (
                                            <div className="space-y-2">
                                                <Label>{"\u00cdcone em emoji"}</Label>
                                                <div className="flex flex-wrap gap-2 rounded-[24px] border bg-background p-3">
                                                    {EMOJI_OPTIONS.map((emoji) => (
                                                        <button key={emoji} type="button" onClick={() => setNovoBanner((prev) => ({ ...prev, emoji }))} className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-all hover:scale-110 active:scale-95 ${novoBanner.emoji === emoji ? "bg-[#2563eb] text-white shadow-lg" : "bg-white hover:bg-blue-50"}`}>{emoji}</button>
                                                    ))}
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{"Outro"}</span>
                                                        <Input className="h-11 w-16 rounded-2xl text-center text-xl" value={novoBanner.emoji} maxLength={4} onChange={(event) => setNovoBanner((prev) => ({ ...prev, emoji: event.target.value }))} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : novoBanner.tipo_midia === "banner_pronto" ? (
                                            <div className="space-y-3">
                                                <Label>{"Link da imagem promocional"}</Label>
                                                <div className="flex flex-col gap-3 rounded-[24px] border bg-background p-4">
                                                    <Input placeholder="https://exemplo.com/banner-pronto.jpg" value={novoBanner.imagem_url} onChange={(event) => setNovoBanner((prev) => ({ ...prev, imagem_url: event.target.value }))} />
                                                    <p className="text-xs text-muted-foreground">Cole o link de uma imagem hospedada (Imgur, Google Drive, etc). A imagem será exibida por completo na vitrine — o texto já vem incluso na arte.</p>
                                                    {novoBanner.imagem_url && (
                                                        <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-muted shadow-sm">
                                                            <Image src={novoBanner.imagem_url} alt="Banner pronto" fill sizes="600px" className="object-contain" unoptimized />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <Label>{"Imagem local"}</Label>
                                                <div className="flex flex-col gap-3 rounded-[24px] border bg-background p-4">
                                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 py-5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100">
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

                                    {novoBanner.tipo_midia !== "banner_pronto" && (
                                        <>
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

                                            <div className="space-y-4 rounded-[24px] border border-blue-200 bg-blue-50/40 p-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-sm font-bold text-[#1e40af]">
                                                            <Sparkles className="h-4 w-4" /> Intensidade da animação
                                                        </Label>
                                                        <p className="text-xs text-[#1e40af]/70">Aumente para movimentos mais rápidos e amplos.</p>
                                                    </div>
                                                    <Badge variant="outline" className="border-blue-200 bg-white text-blue-700">
                                                        {novoBanner.intensidade_animacao.toFixed(1)}x
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-bold text-blue-400">SOFT</span>
                                                    <input
                                                        type="range"
                                                        min="0.2"
                                                        max="4"
                                                        step="0.1"
                                                        value={novoBanner.intensidade_animacao}
                                                        onChange={(event) => setNovoBanner((prev) => ({ ...prev, intensidade_animacao: Number(event.target.value) }))}
                                                        className="h-2 w-full appearance-none rounded-lg bg-blue-200 accent-[#2563eb]"
                                                    />
                                                    <span className="text-[10px] font-bold text-blue-700">EXTREME</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 rounded-[24px] border border-violet-200 bg-violet-50/40 p-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-sm font-bold text-violet-700">
                                                            <Sparkles className="h-4 w-4" /> Tipo de animação do texto
                                                        </Label>
                                                        <p className="text-xs text-violet-700/70">Apenas na entrada ou em loop contínuo.</p>
                                                    </div>
                                                    <Select value={novoBanner.animacao_texto_tipo} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, animacao_texto_tipo: value as TextAnimationType }))}>
                                                        <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                                        <SelectContent>{TEXT_ANIMATION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <p className="text-xs text-violet-700/70">{TEXT_ANIMATION_TYPES.find((t) => t.value === novoBanner.animacao_texto_tipo)?.description}</p>
                                            </div>

                                            <div className="space-y-4 rounded-[24px] border border-violet-200 bg-violet-50/40 p-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="flex items-center gap-2 text-sm font-bold text-violet-700">
                                                            <Sparkles className="h-4 w-4" /> Intensidade da animação do texto
                                                        </Label>
                                                        <p className="text-xs text-violet-700/70">Velocidade e amplitude do movimento do texto.</p>
                                                    </div>
                                                    <Badge variant="outline" className="border-violet-200 bg-white text-violet-700">
                                                        {novoBanner.intensidade_animacao_texto.toFixed(1)}x
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-bold text-violet-400">SOFT</span>
                                                    <input
                                                        type="range"
                                                        min="0.2"
                                                        max="4"
                                                        step="0.1"
                                                        value={novoBanner.intensidade_animacao_texto}
                                                        onChange={(event) => setNovoBanner((prev) => ({ ...prev, intensidade_animacao_texto: Number(event.target.value) }))}
                                                        className="h-2 w-full appearance-none rounded-lg bg-violet-200 accent-[#7c3aed]"
                                                    />
                                                    <span className="text-[10px] font-bold text-violet-700">EXTREME</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-4 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                        <Label className="flex items-center gap-2 text-sm font-bold"><Layout className="h-4 w-4 text-[#2563eb]" /> Layout do card</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {LAYOUT_OPTIONS.map((layout) => (
                                                <button
                                                    key={layout.value}
                                                    type="button"
                                                    onClick={() => setNovoBanner((prev) => ({ ...prev, layout_type: layout.value }))}
                                                    className={`rounded-2xl border p-3 text-left transition-colors ${novoBanner.layout_type === layout.value ? "border-[#2563eb] bg-blue-50 ring-2 ring-blue-200" : "border-border bg-background hover:bg-muted/40"}`}
                                                >
                                                    <div className="text-lg mb-1">{layout.icon}</div>
                                                    <div className="text-xs font-semibold leading-tight">{layout.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{LAYOUT_OPTIONS.find((l) => l.value === novoBanner.layout_type)?.description}</p>
                                    </div>

                                    <div className="space-y-4 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                        <Label className="flex items-center gap-2 text-sm font-bold">Fonte do texto</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {FONT_PRESETS.map((font) => (
                                                <button
                                                    key={font.value}
                                                    type="button"
                                                    onClick={() => setNovoBanner((prev) => ({ ...prev, font_preset: font.value }))}
                                                    className={`rounded-2xl border p-2 text-center transition-colors ${novoBanner.font_preset === font.value ? "border-[#2563eb] bg-blue-50 ring-2 ring-blue-200" : "border-border bg-background hover:bg-muted/40"}`}
                                                >
                                                    <div className="text-[10px] font-bold leading-tight">{font.label}</div>
                                                    <div className="text-[9px] text-muted-foreground truncate">{font.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                            <Label className="text-xs font-bold">Estilo do botão</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {BUTTON_STYLES.map((style) => (
                                                    <button
                                                        key={style.value}
                                                        type="button"
                                                        onClick={() => setNovoBanner((prev) => ({ ...prev, button_style: style.value }))}
                                                        className={`px-4 py-2 text-xs font-bold border transition-colors ${style.className} ${novoBanner.button_style === style.value ? "border-[#2563eb] bg-blue-50 text-[#2563eb] ring-2 ring-blue-200" : "border-border bg-background text-muted-foreground hover:bg-muted/40"}`}
                                                    >
                                                        {style.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                            <Label className="text-xs font-bold">Raio dos cantos</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {CORNER_RADIUS_OPTIONS.map((r) => (
                                                    <button
                                                        key={r.value}
                                                        type="button"
                                                        onClick={() => setNovoBanner((prev) => ({ ...prev, corner_radius: r.value }))}
                                                        className={`px-3 py-2 text-xs font-bold border transition-colors ${r.className} ${novoBanner.corner_radius === r.value ? "border-[#2563eb] bg-blue-50 text-[#2563eb] ring-2 ring-blue-200" : "border-border bg-background text-muted-foreground hover:bg-muted/40"}`}
                                                    >
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                            <Label className="text-xs font-bold">Badge / selo</Label>
                                            <Select value={novoBanner.badge_text} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, badge_text: value }))}>
                                                <SelectTrigger><SelectValue placeholder="Badge" /></SelectTrigger>
                                                <SelectContent>{BADGE_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            {novoBanner.badge_text !== "none" && (
                                                <div className="mt-2">
                                                    <Label className="text-[10px] font-bold text-muted-foreground">Posição</Label>
                                                    <Select value={novoBanner.badge_position} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, badge_position: value as BadgePosition }))}>
                                                        <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                                                        <SelectContent>{BADGE_POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {(novoBanner.layout_type === "centered" || novoBanner.layout_type === "hero") && (
                                        <div className="space-y-4 rounded-[24px] border border-amber-200 bg-amber-50/40 p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <Label className="flex items-center gap-2 text-sm font-bold text-amber-700">
                                                        Opacidade do overlay
                                                    </Label>
                                                    <p className="text-xs text-amber-700/70">Escurece o fundo para destacar o texto.</p>
                                                </div>
                                                <Badge variant="outline" className="border-amber-200 bg-white text-amber-700">
                                                    {(novoBanner.overlay_opacity * 100).toFixed(0)}%
                                                </Badge>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.05"
                                                max="0.85"
                                                step="0.05"
                                                value={novoBanner.overlay_opacity}
                                                onChange={(event) => setNovoBanner((prev) => ({ ...prev, overlay_opacity: Number(event.target.value) }))}
                                                className="w-full accent-[#d97706]"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-4 border-t pt-6">
                                        <Label className="flex items-center gap-2 text-sm font-bold"><Layout className="h-4 w-4 text-[#2563eb]" />Ação ao clicar</Label>
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
                                                            <button key={entity.id} type="button" onClick={() => { setNovoBanner((prev) => ({ ...prev, link_id: entity.id })); setSearchTerm(entity.nome) }} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${novoBanner.link_id === entity.id ? "bg-blue-100 font-bold text-[#2563eb]" : "hover:bg-muted"}`}>
                                                                <span>{entity.nome}</span>
                                                                {novoBanner.link_id === entity.id && <Check className="h-4 w-4" />}
                                                            </button>
                                                        )) : <p className="py-4 text-center text-xs text-muted-foreground">{"Nenhum resultado encontrado."}</p>}
                                                    </div>
                                                </div>
                                            )}

                                            {novoBanner.tipo_link === "restaurant" && novoBanner.link_id && (
                                                <div className="space-y-2 rounded-[24px] border border-blue-200 bg-blue-50/60 p-4">
                                                    <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]"><ShoppingBag className="h-3.5 w-3.5" />{"Direto para um item do restaurante"}</Label>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                        <Input placeholder={"Buscar produto ou combo"} className="pl-9" value={itemSearchTerm} onChange={(event) => setItemSearchTerm(event.target.value)} />
                                                        {novoBanner.item_id && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-red-500 hover:bg-transparent hover:text-red-700" onClick={() => { setNovoBanner((prev) => ({ ...prev, item_id: null })); setItemSearchTerm("") }}><X className="h-4 w-4" /></Button>}
                                                    </div>
                                                    <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-2xl border bg-white p-1">
                                                        {filteredItems.length > 0 ? filteredItems.map((item) => (
                                                            <button key={item.id} type="button" onClick={() => { setNovoBanner((prev) => ({ ...prev, item_id: item.id })); setItemSearchTerm(item.nome) }} className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${novoBanner.item_id === item.id ? "bg-[#2563eb] font-bold text-white" : "hover:bg-blue-50"}`}>
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
                                        <Label className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-[#2563eb]" />{"Regras de tempo"}</Label>
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

                                    <div className="space-y-4 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                                        <Label className="flex items-center gap-2 text-sm font-bold">Overlay de logo</Label>
                                        <div className="space-y-3">
                                            <Input placeholder="https://exemplo.com/logo.png" value={novoBanner.logo_url} onChange={(event) => setNovoBanner((prev) => ({ ...prev, logo_url: event.target.value }))} />
                                            {novoBanner.logo_url && (
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted shadow-sm">
                                                        <img src={novoBanner.logo_url} alt="logo preview" className="h-full w-full object-contain" />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <Label className="text-[10px] font-bold text-muted-foreground">Posição do logo</Label>
                                                        <Select value={novoBanner.logo_position} onValueChange={(value) => setNovoBanner((prev) => ({ ...prev, logo_position: value as LogoPosition }))}>
                                                            <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                                                            <SelectContent>{LOGO_POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" className="rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => setNovoBanner((prev) => ({ ...prev, logo_url: "" }))}><X className="h-4 w-4" /></Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {novoBanner.layout_type === "hero" && novoBanner.tipo_midia === "image" && (
                                        <div className="space-y-4 rounded-[24px] border border-indigo-200 bg-indigo-50/40 p-5">
                                            <Label className="flex items-center gap-2 text-sm font-bold text-indigo-700">Foco da imagem (hero)</Label>
                                            <p className="text-xs text-indigo-700/70">Ajuste o ponto focal da imagem de fundo.</p>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                                                        <span>Foco X</span>
                                                        <span>{novoBanner.media_focal_x}%</span>
                                                    </div>
                                                    <input type="range" min="0" max="100" step="1" value={novoBanner.media_focal_x} onChange={(event) => setNovoBanner((prev) => ({ ...prev, media_focal_x: Number(event.target.value) }))} className="w-full accent-[#6366f1]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                                                        <span>Foco Y</span>
                                                        <span>{novoBanner.media_focal_y}%</span>
                                                    </div>
                                                    <input type="range" min="0" max="100" step="1" value={novoBanner.media_focal_y} onChange={(event) => setNovoBanner((prev) => ({ ...prev, media_focal_y: Number(event.target.value) }))} className="w-full accent-[#6366f1]" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-[28px] border bg-muted/20 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{"Preview ao vivo"}</p>
                                            {novoBanner.tipo_midia === "image" && <Badge variant="outline">{"Imagem livre, sem c\u00edrculo"}</Badge>}
                                            {novoBanner.tipo_midia === "banner_pronto" && <Badge variant="outline">{"Banner promocional completo"}</Badge>}
                                        </div>
                                        <BannerShowcase
                                            banner={{ ...normalizeBannerDraft(novoBanner), titulo: novoBanner.titulo || "Pizza em dobro!", subtitulo: novoBanner.subtitulo || "Compre 1 e leve outra pequena com sensação de campanha premium.", botao_texto: novoBanner.botao_texto || "Pedir agora", ativo: novoBanner.ativo, eyebrow: destinationSummary }}
                                            compact
                                            editable={novoBanner.tipo_midia === "image"}
                                            onMediaPositionChange={(x, y) => setNovoBanner((prev) => ({ ...prev, media_offset_x: x, media_offset_y: y }))}
                                        />

                                        {novoBanner.tipo_midia === "image" && novoBanner.imagem_url && (
                                            <div className="mt-4 space-y-4 rounded-[24px] border border-blue-200 bg-blue-50/70 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-[#1e40af]">{"Editor r\u00e1pido da arte"}</p>
                                                        <p className="text-xs text-[#1e40af]/80">{"Arraste a imagem no preview e ajuste o tamanho aqui at\u00e9 ficar do jeito certo."}</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="rounded-2xl border-blue-200 bg-white/80 text-[#2563eb] hover:bg-white"
                                                        onClick={() => setNovoBanner((prev) => ({ ...prev, media_scale: 1, media_offset_x: 0, media_offset_y: 0 }))}
                                                    >
                                                        {"Resetar arte"}
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#1e40af]">
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
                                                        className="w-full accent-[#2563eb]"
                                                    />
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-[#1e40af]">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]/80">Posição X</div>
                                                        <div className="mt-1 font-semibold">{Math.round(novoBanner.media_offset_x)} px</div>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-[#1e40af]">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]/80">Posição Y</div>
                                                        <div className="mt-1 font-semibold">{Math.round(novoBanner.media_offset_y)} px</div>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-[#1e40af]">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]/80">Animação</div>
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
                                                <Badge variant="outline">{"Visual: "}{novoBanner.tipo_midia !== "banner_pronto" ? resolveTheme(novoBanner.cor_fundo).label : "Imagem pronta"}</Badge>
                                                <Badge variant="outline">{"M\u00eddia: "}{novoBanner.tipo_midia === "image" ? "Imagem" : novoBanner.tipo_midia === "banner_pronto" ? "Banner pronto" : "Emoji"}</Badge>
                                                {novoBanner.tipo_midia !== "banner_pronto" && <Badge variant="outline">{"Texto: "}{novoBanner.animacao_texto}</Badge>}
                                                {novoBanner.tipo_midia !== "banner_pronto" && <Badge variant="outline">{"M\u00eddia: "}{novoBanner.animacao_midia}</Badge>}
                                                {novoBanner.tipo_midia === "image" && <Badge variant="outline">{"Escala: "}{novoBanner.media_scale.toFixed(2)}x</Badge>}
                                                {novoBanner.tipo_midia !== "banner_pronto" && <Badge variant="outline">{"Layout: "}{LAYOUT_OPTIONS.find((l) => l.value === novoBanner.layout_type)?.label || novoBanner.layout_type}</Badge>}
                                                {novoBanner.tipo_midia !== "banner_pronto" && <Badge variant="outline">{"Fonte: "}{FONT_PRESETS.find((f) => f.value === novoBanner.font_preset)?.label || novoBanner.font_preset}</Badge>}
                                                {novoBanner.tipo_midia !== "banner_pronto" && novoBanner.badge_text !== "none" && <Badge variant="outline">{"Selo: "}{novoBanner.badge_text}</Badge>}
                                                <Badge variant="outline">{"Ordem: "}{novoBanner.ordem}</Badge>
                                            </div>
                                            <div className="rounded-2xl bg-muted/60 p-4 text-muted-foreground">{destinationSummary}</div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                                <Button type="submit" disabled={isSubmitting || ((novoBanner.tipo_link === "restaurant" || novoBanner.tipo_link === "category") && !novoBanner.link_id) || ((novoBanner.tipo_midia === "image" || novoBanner.tipo_midia === "banner_pronto") && !novoBanner.imagem_url)} className="h-12 w-full rounded-2xl bg-[#2563eb] text-base font-bold text-white shadow-lg hover:bg-[#1d4ed8]">
                                    {isSubmitting ? "Salvando visual..." : editingId ? "Salvar alterações" : "Criar banner"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <BannerCropDialog
                    file={cropFile!}
                    open={!!cropFile && !isUploadingStorage}
                    onConfirm={handleCropConfirm}
                    onCancel={() => setCropFile(null)}
                />

                {isUploadingStorage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="rounded-2xl bg-white p-6 text-center shadow-xl">
                            <div className="animate-spin h-8 w-8 border-4 border-[#2563eb] border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-sm font-semibold">Enviando banner...</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full flex flex-col items-center gap-4 py-28 text-center"><RefreshCw className="h-10 w-10 animate-spin text-[#2563eb]" /><p className="text-lg font-bold italic">Carregando vitrine...</p></div>
                    ) : banners.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-[40px] border-2 border-dashed border-[#cbd5e1] py-28 text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50"><Plus className="h-10 w-10 text-[#2563eb]" /></div>
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
                                layout_type: (banner as any).layout_type || "text-left",
                                font_preset: (banner as any).font_preset || "impact",
                                badge_text: (banner as any).badge_text || "none",
                                badge_position: (banner as any).badge_position || "top-right",
                                button_style: (banner as any).button_style || "pill",
                                corner_radius: (banner as any).corner_radius || "rounded",
                                overlay_opacity: (banner as any).overlay_opacity ?? 0.4,
                                animacao_texto_tipo: (banner as any).animacao_texto_tipo || "entrance",
                                intensidade_animacao_texto: (banner as any).intensidade_animacao_texto ?? 1,
                                logo_url: (banner as any).logo_url || "",
                                logo_position: (banner as any).logo_position || "top-left",
                                media_focal_x: (banner as any).media_focal_x ?? 50,
                                media_focal_y: (banner as any).media_focal_y ?? 50,
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
                                                    <Badge variant="outline">{hydratedBanner.tipo_midia === "image" ? "Imagem" : hydratedBanner.tipo_midia === "banner_pronto" ? "Banner pronto" : "Emoji"}</Badge>
                                                    {banner.item_id && <Badge variant="outline">Direto ao item</Badge>}
                                                </div>
                                                <div className="grid gap-2 text-sm text-muted-foreground">
                                                    {hydratedBanner.tipo_midia !== "banner_pronto" && <div className="rounded-2xl bg-muted/50 px-4 py-3">Botão: <span className="font-semibold text-foreground">{banner.botao_texto || "Pedir agora"}</span></div>}
                                                    {hydratedBanner.tipo_midia !== "banner_pronto" && <div className="rounded-2xl bg-muted/50 px-4 py-3">Texto: {hydratedBanner.animacao_texto} • Mídia: {hydratedBanner.animacao_midia} • Layout: {LAYOUT_OPTIONS.find(l => l.value === hydratedBanner.layout_type)?.label || hydratedBanner.layout_type} • Fonte: {FONT_PRESETS.find(f => f.value === hydratedBanner.font_preset)?.label || hydratedBanner.font_preset} • Botão: {BUTTON_STYLES.find(s => s.value === hydratedBanner.button_style)?.label || hydratedBanner.button_style} • Raio: {CORNER_RADIUS_OPTIONS.find(r => r.value === hydratedBanner.corner_radius)?.label || hydratedBanner.corner_radius}{hydratedBanner.tipo_midia === "image" ? ` • Escala ${hydratedBanner.media_scale?.toFixed(2)}x` : ""}</div>}
                                                    {banner.horario_inicio && <div className="rounded-2xl bg-muted/50 px-4 py-3">Janela ativa: {banner.horario_inicio} - {banner.horario_fim || "23:59"}</div>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant={banner.ativo ? "outline" : "default"} className="flex-1 rounded-2xl font-bold" onClick={() => toggleStatus(banner.id, banner.ativo)}>{banner.ativo ? "Pausar" : "Ativar"}</Button>
                                                    <Button variant="outline" size="icon" className="rounded-2xl border-blue-200 text-[#2563eb] hover:bg-blue-50" onClick={() => handleOpenDialog(banner)}><Pencil className="h-4 w-4" /></Button>
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





