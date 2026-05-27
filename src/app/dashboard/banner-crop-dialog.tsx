"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Crop, ZoomIn, ZoomOut, X } from "lucide-react"

const ASPECT_RATIO = 2 / 1
const OUTPUT_WIDTH = 800
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / ASPECT_RATIO)

type BannerCropDialogProps = {
  file: File
  open: boolean
  onConfirm: (croppedBlob: Blob, previewUrl: string) => void
  onCancel: () => void
}

export default function BannerCropDialog({ file, open, onConfirm, onCancel }: BannerCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageSrc, setImageSrc] = useState("")
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const getContainerRect = () => {
    if (!containerRef.current) return { width: 0, height: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((prev) => Math.max(0.3, Math.min(3, prev + delta)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setOffsetStart({ x: offsetX, y: offsetY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setOffsetX(offsetStart.x + dx)
    setOffsetY(offsetStart.y + dy)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleConfirm = async () => {
    if (!imageRef.current || !containerRef.current) return
    setIsProcessing(true)

    const container = containerRef.current.getBoundingClientRect()
    const img = imageRef.current
    const imgRect = img.getBoundingClientRect()

    const cropLeft = (container.left - imgRect.left) / imgRect.width
    const cropTop = (container.top - imgRect.top) / imgRect.height
    const cropWidth = container.width / imgRect.width
    const cropHeight = container.height / imgRect.height

    const canvas = document.createElement("canvas")
    canvas.width = OUTPUT_WIDTH
    canvas.height = OUTPUT_HEIGHT
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(
      img,
      cropLeft * img.naturalWidth,
      cropTop * img.naturalHeight,
      cropWidth * img.naturalWidth,
      cropHeight * img.naturalHeight,
      0, 0,
      OUTPUT_WIDTH, OUTPUT_HEIGHT,
    )

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsProcessing(false)
        return
      }
      onConfirm(blob, canvas.toDataURL("image/webp", 0.92))
    }, "image/webp", 0.92)
  }

  const handleReset = () => {
    setScale(1)
    setOffsetX(0)
    setOffsetY(0)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-3xl rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Crop className="h-5 w-5 text-[#2563eb]" />
            Ajustar banner
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Arraste para posicionar e use o zoom para enquadrar o banner no formato 2:1.
          </p>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-xl bg-[#0f172a] cursor-grab active:cursor-grabbing select-none"
          style={{ aspectRatio: "2 / 1" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageSrc && (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="pointer-events-none absolute"
              draggable={false}
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.15s ease-out",
                maxWidth: "none",
                width: "100%",
                height: "auto",
              }}
            />
          )}

          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.55)]" style={{ clipPath: "inset(0)" }} />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-32 accent-[#2563eb]"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Resetar
          </button>
          <div className="flex-1" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="rounded-xl">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing || !imageSrc}
              className="rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
            >
              {isProcessing ? "Processando..." : "Aplicar corte"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
