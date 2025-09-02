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

  async function generateWithPrompt(p: string) {
    setError(null)
    setResultBase64(null)

    let promptText = p.trim()
    const overlaysExist = overlays.length > 0
    if (!promptText && overlaysExist) {
      const parts = overlays
        .map((ov) => assets.find((a) => a.id === ov.assetId))
        .filter(Boolean)
        .map((a) => `${a!.category}: ${a!.name}`)
      promptText = `Integrate these cosmetic parts into the car photo realistically (correct perspective, lighting, reflections, shadows, and alignment). Avoid artifacts and keep background unchanged. Parts: ${parts.join(", ")}.`
      setPrompt(promptText)
    }

    if (!promptText) {
      setError("Enter a prompt or add assets to auto‑prompt")
      return
    }

    try {
      setLoading(true)
      let res: Response
      if (progressive && baseImageDataUrl) {
        let overlayDataUrls: string[] = []
        if (overlaysExist) {
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
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText, image: baseImageDataUrl, overlays: overlayDataUrls }),
        })
      } else if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError("Image is too large (max 10MB)")
          return
        }
        const form = new FormData()
        form.append("prompt", promptText)
        form.append("image", file)
        res = await fetch("/api/generate", { method: "POST", body: form })
      } else {
        setError("Please upload a base vehicle image")
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to generate image")
      setResultBase64(data.image)
      if (progressive && data.image) {
        setBaseImageDataUrl(`data:image/png;base64,${data.image}`)
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to generate image")
    } finally {
      setLoading(false)
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    await generateWithPrompt(prompt)
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
    if (!prompt.trim()) {
      setError("Enter a prompt to save as a mod")
      return
    }
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

      const ins = await supabase
        .from("mods")
        .insert({ user_id: userId, name, prompt, image_path: path, width: dims.w, height: dims.h })
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
          Upload a base photo, describe the cosmetic changes, and generate an
          edited preview with Gemini 2.5 Flash. This is a minimal editing flow
          for now.
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
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={onGenerate}
            loading={loading}
            error={error}
          />

          <ModsCard
            modName={modName}
            setModName={setModName}
            mods={mods}
            onSaveMod={saveCurrentAsMod}
            onLoadPrompt={(p) => setPrompt(p)}
            onGenerateFromPrompt={(p) => { setPrompt(p); generateWithPrompt(p) }}
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

