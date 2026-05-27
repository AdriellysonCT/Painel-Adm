import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabaseClient"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 2MB." }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || "webp"
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    const filePath = `promocionais/${fileName}`

    const supabase = createAdminClient()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from("banners")
      .upload(filePath, buffer, {
        contentType: file.type || "image/webp",
        cacheControl: "31536000",
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: `Erro no upload: ${error.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from("banners")
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrl, path: filePath })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    )
  }
}
