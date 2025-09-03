import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI, Modality } from "@google/genai"
import { createClient as createSupabaseServer } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: GEMINI_API_KEY is missing" },
      { status: 500 }
    )
  }

  try {
    // Auth: require signed-in user for usage tracking and limits
    const supabase = await createSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch profile for limits
    const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || 25)
    let dailyCount = 0
    let profileId: string | null = null
    let prevUpdatedAt: string | null = null
    let prevBytesUsed = 0
    {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, images_generated, updated_at, bytes_used")
        .eq("id", user.id)
        .single()
      if (profile) {
        profileId = profile.id
        prevUpdatedAt = profile.updated_at as unknown as string
        prevBytesUsed = Number((profile as { bytes_used?: number }).bytes_used || 0)
        const last = profile.updated_at ? new Date(profile.updated_at) : null
        const now = new Date()
        const isStale = !last || now.getTime() - last.getTime() > 24 * 60 * 60 * 1000
        dailyCount = isStale ? 0 : Number(profile.images_generated || 0)
        if (dailyCount >= FREE_DAILY_LIMIT) {
          return NextResponse.json(
            { error: "Free plan daily limit reached" },
            { status: 429 }
          )
        }
      }
    }
    const contentType = req.headers.get("content-type") || ""

  let prompt = ""
  let mimeType = "image/png"
  let base64Image = ""
  const overlayImages: Array<{ mimeType: string; data: string }> = []
  let overlaySpecs: Array<{ index?: number; xNorm?: number; yNorm?: number; xPx?: number; yPx?: number; scale?: number; rotationDeg?: number; z?: number }> = []

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const file = form.get("image")
      prompt = String(form.get("prompt") || "")

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No image uploaded" }, { status: 400 })
      }
      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
      }

      mimeType = file.type || mimeType
      const buf = Buffer.from(await file.arrayBuffer())
      base64Image = buf.toString("base64")
    } else {
      const json = await req.json().catch(() => null)
      if (!json) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      prompt = String(json.prompt || "")
      const image = String(json.image || "")
      if (!prompt || !image) {
        // Allow prompt to be omitted if overlay guidance is provided
        if (!image) {
          return NextResponse.json({ error: "Image is required" }, { status: 400 })
        }
      }
      // Support data URLs or raw base64
      const match = image.match(/^data:(.*?);base64,(.*)$/)
      if (match) {
        mimeType = match[1] || mimeType
        base64Image = match[2] || ""
      } else {
        base64Image = image
      }

      // Optional overlay reference images: array of data URLs or base64 strings
      const overlays = Array.isArray((json as { overlays?: unknown }).overlays)
        ? ((json as { overlays: unknown[] }).overlays as unknown[])
        : []
      for (const o of overlays) {
        if (typeof o !== "string") continue
        const mm = o.match(/^data:(.*?);base64,(.*)$/)
        if (mm) overlayImages.push({ mimeType: mm[1] || "image/png", data: mm[2] || "" })
        else overlayImages.push({ mimeType: "image/png", data: o })
      }

      // Optional structured placement metadata
      const specs = Array.isArray((json as { overlaySpecs?: unknown }).overlaySpecs)
        ? ((json as { overlaySpecs: unknown[] }).overlaySpecs as unknown[])
        : []
      overlaySpecs = specs.filter((s) => typeof s === "object" && s !== null) as typeof overlaySpecs
    }

    const ai = new GoogleGenAI({ apiKey })

    // Build concise instructions: if overlay images present, include placement guidance
    const systemInstrBase = overlayImages.length > 0
      ? [
          "You will receive a base vehicle photo and one or more overlay PNGs.",
          "Seamlessly integrate each overlay into the base at the specified positions and rotations.",
          "Preserve the original background; align perspective, lighting, reflections and shadows.",
          "Return only a single edited image (no text).",
          "Maintain the original canvas/resolution of the base image. Do not crop or add borders.",
        ].join("\n")
      : [
          "Edit the provided base image according to the instructions.",
          "Return only a single edited image (no text).",
          "Maintain the original canvas/resolution of the base image. Do not crop or add borders.",
        ].join("\n")

    // If prompt missing but overlays provided, synthesize a minimal prompt that includes placement JSON
    if ((!prompt || !prompt.trim()) && overlayImages.length > 0) {
      const placement = JSON.stringify({ overlays: overlaySpecs }, null, 0)
      prompt = [
        "Integrate the overlay images into the base vehicle photo at the specified positions.",
        "Placement (one per overlay, in order):",
        placement,
      ].join("\n")
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      generationConfig: {
        // Nudge API to return an image part, not just text
        responseModalities: [Modality.IMAGE],
      },
      contents: [
        // Provide overlay assets first, then the base scene, then instructions
        ...overlayImages.map((o) => ({ inlineData: { mimeType: o.mimeType, data: o.data } })),
        { inlineData: { mimeType, data: base64Image } },
        {
          text: [
            `${systemInstrBase}`,
            overlaySpecs.length > 0 ? `Placement JSON (normalized and/or pixel centers):\n${JSON.stringify({ overlays: overlaySpecs })}` : "",
            `The first ${overlayImages.length} image(s) are overlay parts to integrate; the next image is the base scene to edit. Place each overlay once at its specified position.`,
            String(prompt || "")
          ].filter(Boolean).join("\n\n"),
        },
      ],
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

    // Update usage counters (daily images + bytes)
    try {
      const bytesApprox = Math.floor((outBase64.length * 3) / 4)
      const nowIso = new Date().toISOString()
      if (profileId) {
        const reset = prevUpdatedAt
          ? new Date().getTime() - new Date(prevUpdatedAt).getTime() > 24 * 60 * 60 * 1000
          : true
        const newDaily = reset ? 1 : dailyCount + 1
        const newBytes = prevBytesUsed + bytesApprox
        await supabase
          .from("profiles")
          .update({ images_generated: newDaily, bytes_used: newBytes, updated_at: nowIso })
          .eq("id", profileId)
      }
    } catch (e) {
      // Non-fatal: log and continue
      console.error("profiles usage update failed", e)
    }

    return NextResponse.json({ image: outBase64, mimeType: "image/png", text })
  } catch (err: unknown) {
    console.error("/api/generate error", err)
    return NextResponse.json(
      { error: (err as Error)?.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
