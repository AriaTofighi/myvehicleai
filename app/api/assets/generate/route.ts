import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { createClient as createSupabaseServer } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

type BodyJson = {
  name: string
  category: string
  prompt: string
  image?: string | null // optional data URL or base64 for reference
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: GEMINI_API_KEY is missing" },
      { status: 500 }
    )
  }

  try {
    const supabase = await createSupabaseServer()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const contentType = req.headers.get("content-type") || ""

    let name = ""
    let category = ""
    let prompt = ""
    let mimeType: string | undefined
    let base64Image: string | undefined

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      name = String(form.get("name") || "")
      category = String(form.get("category") || "")
      prompt = String(form.get("prompt") || "")
      const file = form.get("image")
      if (file instanceof File) {
        mimeType = file.type || "image/png"
        const buf = Buffer.from(await file.arrayBuffer())
        base64Image = buf.toString("base64")
      }
    } else {
      const body = (await req.json().catch(() => null)) as BodyJson | null
      if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      name = String(body.name || "")
      category = String(body.category || "")
      prompt = String(body.prompt || "")
      if (body.image) {
        const match = String(body.image).match(/^data:(.*?);base64,(.*)$/)
        if (match) {
          mimeType = match[1]
          base64Image = match[2]
        } else {
          base64Image = body.image
        }
      }
    }

    if (!name || !category || !prompt) {
      return NextResponse.json(
        { error: "name, category, and prompt are required" },
        { status: 400 }
      )
    }

    // Craft a model instruction to prefer transparent background overlays
    const ai = new GoogleGenAI({ apiKey })

    const systemInstr = `You produce a single cosmetic car part image suitable as an overlay asset.
- Output must be a transparent-background PNG (no background, only the item).
- Center the item, sufficient padding, consistent perspective.
- High-resolution with clean alpha edges. No text or watermarks.`

    const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: `${systemInstr}\n\nCategory: ${category}\nRequest: ${prompt}` },
    ]
    if (base64Image) {
      contents.push({ inlineData: { mimeType: mimeType || "image/png", data: base64Image } })
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    })

    let outBase64: string | null = null
    let text = ""
    const candidate = response.candidates?.[0]
    for (const part of (candidate as unknown as { content?: { parts?: Array<{ text?: string; inlineData?: { data?: string } }> } } | undefined)?.content?.parts || []) {
      if ((part as { text?: string }).text) text += (part as { text?: string }).text || ""
      const inline = (part as { inlineData?: { data?: string } }).inlineData
      if (inline?.data) outBase64 = inline.data
    }

    if (!outBase64) {
      return NextResponse.json(
        { error: "No image returned from model", text },
        { status: 502 }
      )
    }

    const buffer = Buffer.from(outBase64, "base64")
    // Best-effort dimensions (optional)
    let width: number | null = null
    let height: number | null = null
    try {
      // dynamic import to avoid bundling heavy libs; keep simple: decode PNG header minimally
      const sig = buffer.subarray(0, 24)
      const isPng = sig[0] === 0x89 && sig[1] === 0x50
      if (isPng) {
        // IHDR at bytes 16-24 in PNG: width (4), height (4)
        width = buffer.readUInt32BE(16)
        height = buffer.readUInt32BE(20)
      }
    } catch {}

    const path = `${user.id}/${category}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.png`
    const up = await supabase.storage
      .from("mod-assets")
      .upload(path, buffer, { contentType: "image/png", upsert: false })
    if (up.error) {
      console.error("upload failed", up.error)
      return NextResponse.json({ error: up.error.message }, { status: 500 })
    }

    const ins = await supabase
      .from("mod_assets")
      .insert({ user_id: user.id, category, name, prompt, image_path: path, width, height })
      .select("id,user_id,category,name,prompt,image_path,width,height,created_at")
      .single()
    if (ins.error) {
      console.error("db insert failed", ins.error)
      // cleanup uploaded file on failure
      await supabase.storage.from("mod-assets").remove([path])
      return NextResponse.json({ error: ins.error.message }, { status: 500 })
    }

    const signed = await supabase.storage
      .from("mod-assets")
      .createSignedUrl(path, 60 * 60)

    return NextResponse.json({
      asset: ins.data,
      url: signed.data?.signedUrl || null,
    })
  } catch (err: unknown) {
    console.error("/api/assets/generate error", err)
    return NextResponse.json(
      { error: (err as Error)?.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
