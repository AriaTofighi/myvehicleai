"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { ModRow, ModAssetRow, OverlayItem } from "./types";
import { VisualizerCanvas } from "./canvas";
import { SourceCard } from "./source-card";
import { GenerationCard } from "./generation-card";
import { ModsCard } from "./mods-card";
import { AssetGeneratorCard } from "./asset-generator-card";
import { AssetLibraryCard } from "./asset-library-card";
import { SelectedAssetCard } from "./selected-asset-card";
import { LayersCard } from "./layers-card";

export default function VisualizerClient() {
  const [file, setFile] = useState<File | null>(null)
  const [baseImageDataUrl, setBaseImageDataUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<string>("")
  const [progressive, setProgressive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultBase64, setResultBase64] = useState<string | null>(null)
  const [modName, setModName] = useState("")
  const [mods, setMods] = useState<ModRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [assets, setAssets] = useState<ModAssetRow[]>([])
  const [assetCategory, setAssetCategory] = useState<string>("Wheels & Tires / Rims")
  const [assetName, setAssetName] = useState<string>("")
  const [assetPrompt, setAssetPrompt] = useState<string>("")
  const [useBaseAsRef, setUseBaseAsRef] = useState<boolean>(false)

  const [overlays, setOverlays] = useState<OverlayItem[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [genMode, setGenMode] = useState<"integrate" | "prompt">("integrate")
  const supabase = useMemo(() => createClient(), [])

  async function fileToDataUrl(f: File): Promise<string> {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(f)
    })
  }

  async function urlToDataUrl(url: string): Promise<string> {
    const res = await fetch(url)
    const blob = await res.blob()
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error("Failed to read blob"))
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
  }

  async function onSelectFile(f: File | null) {
    setFile(f)
    setResultBase64(null)
    if (f) {
      try {
        const dataUrl = await fileToDataUrl(f)
        setBaseImageDataUrl(dataUrl)
      } catch (e: unknown) {
        setError((e as Error)?.message || "Could not read file")
      }
    } else {
      setBaseImageDataUrl(null)
    }
  }

  const resultSrc = useMemo(
    () => (resultBase64 ? `data:image/png;base64,${resultBase64}` : null),
    [resultBase64]
  )
  const canvasImageSrc = resultSrc || baseImageDataUrl || (file ? URL.createObjectURL(file) : null)

  const CATEGORIES: { key: string; label: string; examples: string[] }[] = [
    { key: "Wheels & Tires / Rims", label: "Wheels & Tires · Rims", examples: ["5-spoke bronze 19\"", "mesh silver 20\"", "black multi-spoke 18\""] },
    { key: "Wheels & Tires / Tires", label: "Wheels & Tires · Tires", examples: ["low-profile performance", "chunky all-terrain"] },
    { key: "Body Kits / Bumpers", label: "Body Kits · Front/Rear Bumpers", examples: ["aggressive front lip", "OEM+ rear diffuser"] },
    { key: "Body Kits / Side Skirts", label: "Body Kits · Side Skirts", examples: ["subtle side skirts"] },
    { key: "Body Kits / Flares", label: "Body Kits · Widebody Flares", examples: ["bolt-on widebody flares"] },
    { key: "Aero / Splitters & Diffusers", label: "Aero · Splitters & Diffusers", examples: ["front splitter", "rear diffuser with fins"] },
    { key: "Aero / Spoilers & Wings", label: "Aero · Spoilers & Wings", examples: ["ducktail", "GT wing", "lip spoiler"] },
    { key: "Hoods & Roof / Hoods", label: "Hoods & Roof · Vented Hoods", examples: ["carbon vented hood"] },
    { key: "Hoods & Roof / Roof", label: "Hoods & Roof · Roof", examples: ["roof scoop", "gloss black roof wrap"] },
    { key: "Lighting / Headlights", label: "Lighting · Headlights", examples: ["LED with DRL", "halo rings", "tinted housings"] },
    { key: "Lighting / Tail lights", label: "Lighting · Tail Lights", examples: ["clear smoked tails", "sequential indicators"] },
    { key: "Lighting / Underglow", label: "Lighting · Underglow", examples: ["neon underglow blue"] },
    { key: "Grilles & Badging / Grilles", label: "Grilles & Badging · Grilles", examples: ["honeycomb mesh"] },
    { key: "Grilles & Badging / Emblems", label: "Grilles & Badging · Emblems", examples: ["debadged front", "custom emblem"] },
    { key: "Mirrors & Windows / Mirrors", label: "Mirrors & Windows · Mirrors", examples: ["F1-style mirrors"] },
    { key: "Mirrors & Windows / Tints", label: "Mirrors & Windows · Tints", examples: ["35% side tint", "limo rear"] },
    { key: "Exhausts", label: "Exhausts", examples: ["dual round tips", "quad square tips"] },
    { key: "Accessories / Decals & Wraps", label: "Accessories · Decals & Wraps", examples: ["stripe vinyl", "full camo wrap"] },
    { key: "Accessories / Racks", label: "Accessories · Roof/Bike Racks", examples: ["slim roof rack"] },
    { key: "Accessories / Misc", label: "Accessories · Misc", examples: ["red tow hook", "mud flaps"] },
  ]

  const loadMods = useMemo(() => (
    async (uid: string) => {
      const { data, error } = await supabase
        .from("mods")
        .select("id,user_id,name,prompt,image_path,width,height,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
      if (error) {
        console.error(error)
        return
      }
      const withUrls: ModRow[] = await Promise.all(
        (data || []).map(async (m) => {
          const { data: signed } = await supabase.storage
            .from("mods")
            .createSignedUrl(m.image_path, 60 * 60)
          return { ...m, signedUrl: signed?.signedUrl || null }
        })
      )
      setMods(withUrls)
    }
  ), [supabase])

  const loadAssets = useMemo(() => (
    async (uid: string) => {
      const { data, error } = await supabase
        .from("mod_assets")
        .select("id,user_id,category,name,prompt,image_path,width,height,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
      if (error) {
        console.error(error)
        return
      }
      const withUrls: ModAssetRow[] = await Promise.all(
        (data || []).map(async (m) => {
          const { data: signed } = await supabase.storage
            .from("mod-assets")
            .createSignedUrl(m.image_path, 60 * 60)
          return { ...m, signedUrl: signed?.signedUrl || null }
        })
      )
      setAssets(withUrls)
    }
  ), [supabase])

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) {
        loadMods(uid)
        loadAssets(uid)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const uid = sess?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        loadMods(uid)
        loadAssets(uid)
      } else {
        setMods([])
        setAssets([])
      }
    })
    return () => {
      mounted = false
      sub.subscription?.unsubscribe()
    }
  }, [supabase, loadMods, loadAssets])

  async function integrateOverlays() {
    setError(null)
    setResultBase64(null)

    const overlaysExist = overlays.length > 0
    if (!baseImageDataUrl) {
      setError("Please upload a base vehicle image")
      return
    }
    if (!overlaysExist) {
      setError("Drag an asset onto the canvas first")
      return
    }

    try {
      setLoading(true)

      // Load base image dimensions to compute pixel positions
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.width, h: img.height })
        img.onerror = () => reject(new Error("Failed to read base image"))
        img.src = baseImageDataUrl
      })

      // Collect overlay images and specs
      let overlayDataUrls: string[] = await Promise.all(
        overlays.map(async (ov) => {
          const u = ov.url || assets.find((a) => a.id === ov.assetId)?.signedUrl || null
          if (!u) return ""
          try {
            const b = await fetch(u).then((r) => r.blob())
            const reader = new FileReader()
            const dataUrl: string = await new Promise((resolve, reject) => {
              reader.onerror = () => reject(new Error("Failed to read overlay"))
              reader.onload = () => resolve(String(reader.result))
              reader.readAsDataURL(b)
            })
            return dataUrl
          } catch {
            return ""
          }
        })
      )
      overlayDataUrls = overlayDataUrls.filter((s) => !!s)
      // Load overlay dimensions
      const overlayDims = await Promise.all(
        overlayDataUrls.map(
          (src) =>
            new Promise<{ w: number; h: number }>((resolve) => {
              if (!src) return resolve({ w: 0, h: 0 })
              const img = new Image()
              img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
              img.onerror = () => resolve({ w: 0, h: 0 })
              img.src = src
            })
        )
      )

      const specs = overlays.map((ov, i) => ({
        index: i + 1,
        xNorm: Number(ov.x.toFixed(4)),
        yNorm: Number(ov.y.toFixed(4)),
        xPx: Math.round(ov.x * dims.w),
        yPx: Math.round(ov.y * dims.h),
        scale: Number(ov.scale.toFixed(3)),
        rotationDeg: Math.round(ov.rotation),
        z: ov.z,
        overlayNatural: overlayDims[i] || { w: 0, h: 0 },
        targetApproxPx: {
          width: Math.max(1, Math.round((overlayDims[i]?.w || 0) * ov.scale)),
          height: Math.max(1, Math.round((overlayDims[i]?.h || 0) * ov.scale)),
        },
      }))

      const promptText = [
        "Integrate the provided overlay images into the base vehicle photo at the specified positions.",
        "Keep the background unchanged. Align perspective, lighting, reflections and shadows.",
        "Place each overlay centered at the given pixel coordinates with the given rotation and scale.",
        "Match each overlay's approximate final size in pixels (width/height) when integrating.",
        "Ignore any padding in overlay images; treat them as transparent PNGs.",
        "Return only a single edited image (no text).",
        "Placement (one per overlay, in order):",
        JSON.stringify({ base: { width: dims.w, height: dims.h }, overlays: specs }),
      ].join("\n")

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, image: baseImageDataUrl, overlays: overlayDataUrls, overlaySpecs: specs }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to generate image")
      // Attempt to crop the result back to the base image aspect ratio if it differs
      if (data.image) {
        try {
          const cropped = await cropToAspect(`data:image/png;base64,${data.image}`)
          const b64 = cropped.replace(/^data:(.*?);base64,/, "").trim()
          setResultBase64(b64)
          if (progressive) setBaseImageDataUrl(cropped)
        } catch {
          setResultBase64(data.image)
          if (progressive) setBaseImageDataUrl(`data:image/png;base64,${data.image}`)
        }
      }
      // Clear overlays after a successful integration to provide a fresh canvas
      setOverlays([])
      setSelectedOverlayId(null)
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to generate image")
    } finally {
      setLoading(false)
    }
  }

  async function generateFromText() {
    setError(null)
    setResultBase64(null)
    const p = prompt.trim()
    if (!p) {
      setError("Enter a prompt")
      return
    }
    if (!baseImageDataUrl) {
      setError("Please upload a base vehicle image")
      return
    }
    try {
      setLoading(true)
      let overlayDataUrls: string[] = []
      if (overlays.length > 0) {
        overlayDataUrls = await Promise.all(
          overlays.map(async (ov) => {
            const u = ov.url || assets.find((a) => a.id === ov.assetId)?.signedUrl || null
            if (!u) return ""
            try {
              const b = await fetch(u).then((r) => r.blob())
              const reader = new FileReader()
              const dataUrl: string = await new Promise((resolve, reject) => {
                reader.onerror = () => reject(new Error("Failed to read overlay"))
                reader.onload = () => resolve(String(reader.result))
                reader.readAsDataURL(b)
              })
              return dataUrl
            } catch {
              return ""
            }
          })
        )
        overlayDataUrls = overlayDataUrls.filter((s) => !!s)
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, image: baseImageDataUrl, overlays: overlayDataUrls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to generate image")
      if (data.image) {
        try {
          const cropped = await cropToAspect(`data:image/png;base64,${data.image}`)
          const b64 = cropped.replace(/^data:(.*?);base64,/, "").trim()
          setResultBase64(b64)
          if (progressive) setBaseImageDataUrl(cropped)
        } catch {
          setResultBase64(data.image)
          if (progressive) setBaseImageDataUrl(`data:image/png;base64,${data.image}`)
        }
      }
      // Keep overlays for text-based generation; only clear on explicit integrate
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to generate image")
    } finally {
      setLoading(false)
    }
  }

  async function cropToAspect(resultDataUrl: string): Promise<string> {
    // Crop the result to the base image's aspect ratio, centered
    const baseDims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      if (!baseImageDataUrl) return reject(new Error("No base image"))
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => reject(new Error("Failed to read base image"))
      img.src = baseImageDataUrl
    })

    return new Promise((resolve, reject) => {
      const out = new Image()
      out.onload = () => {
        const baseAR = baseDims.w / baseDims.h
        const outAR = out.naturalWidth / out.naturalHeight
        let sx = 0, sy = 0, sw = out.naturalWidth, sh = out.naturalHeight
        if (Math.abs(outAR - baseAR) > 0.001) {
          if (outAR > baseAR) {
            // wider than target; crop width
            sh = out.naturalHeight
            sw = Math.round(sh * baseAR)
            sx = Math.round((out.naturalWidth - sw) / 2)
            sy = 0
          } else {
            // taller than target; crop height
            sw = out.naturalWidth
            sh = Math.round(sw / baseAR)
            sx = 0
            sy = Math.round((out.naturalHeight - sh) / 2)
          }
        }
        const canvas = document.createElement("canvas")
        canvas.width = baseDims.w
        canvas.height = baseDims.h
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("Could not get canvas context"))
        ctx.drawImage(out, sx, sy, sw, sh, 0, 0, baseDims.w, baseDims.h)
        resolve(canvas.toDataURL("image/png"))
      }
      out.onerror = () => reject(new Error("Failed to read output image"))
      out.src = resultDataUrl
    })
  }

  async function saveCurrentAsMod() {
    setError(null)
    if (!userId) {
      setError("Please sign in to save mods")
      return
    }
    const snapshot = resultSrc || baseImageDataUrl
    if (!snapshot) {
      setError("Generate or upload an image first")
      return
    }
    const name = modName.trim() || "Untitled Mod"
    try {
      setLoading(true)
      const blob = await (await fetch(snapshot)).blob()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`
      const path = `${userId}/${fileName}`
      const up = await supabase.storage
        .from("mods")
        .upload(path, blob, { contentType: "image/png", upsert: false })
      if (up.error) throw up.error

      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.width, h: img.height })
        img.src = URL.createObjectURL(blob)
      })

      const autoPrompt = prompt.trim() || (() => {
        const count = overlays.length
        return `Auto: integrate ${count} overlay${count === 1 ? "" : "s"} at placed positions`
      })()

      const ins = await supabase
        .from("mods")
        .insert({ user_id: userId, name, prompt: autoPrompt, image_path: path, width: dims.w, height: dims.h })
        .select()
        .single()
      if (ins.error) throw ins.error

      setModName("")
      await loadMods(userId)
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to save mod")
    } finally {
      setLoading(false)
    }
  }

  async function generateAsset() {
    setError(null)
    if (!userId) {
      setError("Please sign in to generate assets")
      return
    }
    const name = assetName.trim() || `${assetCategory} asset`
    const aprompt = assetPrompt.trim()
    if (!aprompt) {
      setError("Enter an asset prompt")
      return
    }
    try {
      setLoading(true)
      const body: Record<string, unknown> = { name, category: assetCategory, prompt: aprompt }
      if (useBaseAsRef && (baseImageDataUrl || resultSrc)) {
        body.image = resultSrc || baseImageDataUrl
      }
      const res = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to generate asset")
      setAssetName("")
      setAssetPrompt("")
      if (userId) await loadAssets(userId)
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to generate asset")
    } finally {
      setLoading(false)
    }
  }

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) || null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Visualizer</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Upload a base photo, drag and place cosmetic parts on the canvas, and integrate them into the image with Gemini 2.5 Flash.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <VisualizerCanvas
          canvasImageSrc={canvasImageSrc}
          overlays={overlays}
          setOverlays={setOverlays}
          selectedOverlayId={selectedOverlayId}
          setSelectedOverlayId={setSelectedOverlayId}
          resultSrc={resultSrc}
          setBaseImageDataUrl={(v) => setBaseImageDataUrl(v)}
          setResultBase64={setResultBase64}
          zoom={zoom}
          setZoom={setZoom}
        />

        <div className="grid gap-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1">
          <SourceCard
            progressive={progressive}
            setProgressive={(v) => setProgressive(v)}
            onSelectFile={onSelectFile}
          />

          <GenerationCard
            mode={genMode}
            setMode={setGenMode}
            prompt={prompt}
            setPrompt={setPrompt}
            onIntegrate={integrateOverlays}
            onGenerateText={generateFromText}
            loading={loading}
            error={error}
            disabled={!baseImageDataUrl || overlays.length === 0}
          />

          <ModsCard
            modName={modName}
            setModName={setModName}
            mods={mods}
            onSaveMod={saveCurrentAsMod}
            onLoadPrompt={(p) => { setGenMode("prompt"); setPrompt(p) }}
            onGenerateFromPrompt={async (p) => { setGenMode("prompt"); setPrompt(p); await generateFromText() }}
            onUseAsBase={async (m) => {
              if (m.signedUrl) {
                const dataUrl = await urlToDataUrl(m.signedUrl)
                setBaseImageDataUrl(dataUrl)
                setResultBase64(null)
              }
            }}
            onDeleteMod={async (m) => {
              await supabase.from("mods").delete().eq("id", m.id)
              await supabase.storage.from("mods").remove([m.image_path])
              if (userId) loadMods(userId)
            }}
          />

          <AssetGeneratorCard
            categories={CATEGORIES}
            assetCategory={assetCategory}
            setAssetCategory={setAssetCategory}
            assetName={assetName}
            setAssetName={setAssetName}
            assetPrompt={assetPrompt}
            setAssetPrompt={setAssetPrompt}
            useBaseAsRef={useBaseAsRef}
            setUseBaseAsRef={setUseBaseAsRef}
            onGenerateAsset={generateAsset}
            loading={loading}
          />

          <AssetLibraryCard
            assets={assets}
            assetCategory={assetCategory}
            onAddFromAsset={(a) => {
              if (!a.signedUrl) return
              const id = `${a.id}-${Date.now()}`
              const z = (overlays[overlays.length - 1]?.z || 0) + 1
              setOverlays((prev) => [
                ...prev,
                { id, assetId: a.id, url: a.signedUrl!, x: 0.5, y: 0.5, scale: 0.4, rotation: 0, z },
              ])
              setSelectedOverlayId(id)
            }}
            onDeleteAsset={async (a) => {
              await supabase.from("mod_assets").delete().eq("id", a.id)
              await supabase.storage.from("mod-assets").remove([a.image_path])
              if (userId) loadAssets(userId)
            }}
          />

          <LayersCard
            overlays={overlays}
            setOverlays={setOverlays}
            assets={assets}
            selectedOverlayId={selectedOverlayId}
            setSelectedOverlayId={setSelectedOverlayId}
          />

          {selectedOverlay ? (
            <SelectedAssetCard
              overlays={overlays}
              setOverlays={setOverlays}
              selectedOverlay={selectedOverlay}
              setSelectedOverlayId={setSelectedOverlayId}
              assets={assets}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
