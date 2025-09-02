"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/utils/supabase/client";

type ModRow = {
  id: string
  user_id: string
  name: string
  prompt: string
  image_path: string
  width: number | null
  height: number | null
  created_at: string
  signedUrl?: string | null
}

type ModAssetRow = {
  id: string
  user_id: string
  category: string
  name: string
  prompt: string
  image_path: string
  width: number | null
  height: number | null
  created_at: string
  signedUrl?: string | null
}

type OverlayItem = {
  id: string // unique client id
  assetId: string
  url: string
  x: number // 0..1 relative to canvas width
  y: number // 0..1 relative to canvas height
  scale: number // 0.1..3
  rotation: number // degrees
  z: number
}

export default function VisualizerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [baseImageDataUrl, setBaseImageDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [progressive, setProgressive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [modName, setModName] = useState("");
  const [mods, setMods] = useState<ModRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [assets, setAssets] = useState<ModAssetRow[]>([]);
  const [assetCategory, setAssetCategory] = useState<string>("Wheels & Tires / Rims");
  const [assetName, setAssetName] = useState<string>("");
  const [assetPrompt, setAssetPrompt] = useState<string>("");
  const [useBaseAsRef, setUseBaseAsRef] = useState<boolean>(false);

  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    id: string | null
    startX: number
    startY: number
    startPos: { x: number; y: number }
  } | null>(null)
  const supabase = useMemo(() => createClient(), []);

  // Helper to convert File to data URL for base usage
  async function fileToDataUrl(f: File): Promise<string> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(f);
    });
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

  // When file is selected, set it and also update the base image data URL
  async function onSelectFile(f: File | null) {
    setFile(f);
    setResultBase64(null);
    if (f) {
      try {
        const dataUrl = await fileToDataUrl(f);
        setBaseImageDataUrl(dataUrl);
      } catch (e: unknown) {
        setError((e as Error)?.message || "Could not read file");
      }
    } else {
      setBaseImageDataUrl(null);
    }
  }

  const resultSrc = useMemo(
    () => (resultBase64 ? `data:image/png;base64,${resultBase64}` : null),
    [resultBase64]
  );
  const canvasImageSrc =
    resultSrc || baseImageDataUrl || (file ? URL.createObjectURL(file) : null);

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

  // Auth + mods bootstrap
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
    setError(null);
    setResultBase64(null);

    if (!p.trim()) {
      setError("Please enter a prompt");
      return;
    }

    try {
      setLoading(true);
      let res: Response;
      if (progressive && baseImageDataUrl) {
        // JSON path with data URL for continuous edits
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: p, image: baseImageDataUrl }),
        });
      } else if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError("Image is too large (max 10MB)");
          return;
        }
        const form = new FormData();
        form.append("prompt", p);
        form.append("image", file);
        res = await fetch("/api/generate", { method: "POST", body: form });
      } else {
        setError("Please upload a base vehicle image");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate image");
      setResultBase64(data.image);
      if (progressive && data.image) {
        setBaseImageDataUrl(`data:image/png;base64,${data.image}`);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    await generateWithPrompt(prompt);
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
    const prompt = assetPrompt.trim()
    if (!prompt) {
      setError("Enter an asset prompt")
      return
    }
    try {
      setLoading(true)
      const body: Record<string, unknown> = { name, category: assetCategory, prompt }
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

  function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!canvasRef.current) return
    const assetId = e.dataTransfer.getData("text/asset-id")
    const url = e.dataTransfer.getData("text/asset-url")
    if (!assetId || !url) return
    const rect = canvasRef.current.getBoundingClientRect()
    const xPx = e.clientX - rect.left
    const yPx = e.clientY - rect.top
    const x = Math.max(0, Math.min(1, xPx / rect.width))
    const y = Math.max(0, Math.min(1, yPx / rect.height))
    const id = `${assetId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const z = (overlays[overlays.length - 1]?.z || 0) + 1
    const item: OverlayItem = { id, assetId, url, x, y, scale: 0.5, rotation: 0, z }
    setOverlays((prev) => [...prev, item])
    setSelectedOverlayId(id)
  }

  function onCanvasDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function beginOverlayDrag(e: React.PointerEvent, id: string) {
    if (!canvasRef.current) return
    const startX = e.clientX
    const startY = e.clientY
    const ov = overlays.find((o) => o.id === id)
    if (!ov) return
    dragStateRef.current = {
      id,
      startX,
      startY,
      startPos: { x: ov.x, y: ov.y },
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onOverlayDragMove(e: React.PointerEvent) {
    if (!dragStateRef.current || !canvasRef.current) return
    const { id, startX, startY, startPos } = dragStateRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    const dx = (e.clientX - startX) / rect.width
    const dy = (e.clientY - startY) / rect.height
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, x: Math.max(0, Math.min(1, startPos.x + dx)), y: Math.max(0, Math.min(1, startPos.y + dy)) } : o))
    )
  }

  function endOverlayDrag() {
    if (dragStateRef.current) {
      dragStateRef.current = null
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
        <Card>
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
            <CardDescription>Drag assets onto your vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              className="aspect-video w-full rounded-lg border bg-muted/30 relative overflow-hidden"
              onDrop={onCanvasDrop}
              onDragOver={onCanvasDragOver}
            >
              {canvasImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={canvasImageSrc}
                  alt="Canvas preview"
                  className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <p className="text-sm text-muted-foreground">
                    Upload an image to preview it here
                  </p>
                </div>
              )}

              {/* Overlays */}
              {overlays.map((o) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={o.id}
                  src={o.url}
                  alt="overlay"
                  className={`absolute cursor-move ${selectedOverlayId === o.id ? "ring-2 ring-primary" : ""}`}
                  style={{
                    left: `${o.x * 100}%`,
                    top: `${o.y * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${o.rotation}deg) scale(${o.scale})`,
                    zIndex: 10 + o.z,
                    maxWidth: "50%",
                  }}
                  onPointerDown={(e) => {
                    setSelectedOverlayId(o.id)
                    beginOverlayDrag(e, o.id)
                  }}
                  onPointerMove={onOverlayDragMove}
                  onPointerUp={endOverlayDrag}
                />
              ))}
            </div>
            {resultSrc ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBaseImageDataUrl(resultSrc!)}
                >
                  Apply result as base
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResultBase64(null)}
                >
                  Clear result
                </Button>
                {overlays.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setOverlays([])
                      setSelectedOverlayId(null)
                    }}
                  >
                    Clear overlays
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
              <CardDescription>Base vehicle photo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
                  className="block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Max 10MB. Supported: common image formats.
                </p>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={progressive}
                    onCheckedChange={(v) => setProgressive(Boolean(v))}
                  />
                  <span>
                    Progressive edits (use latest result as next base)
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Generation</CardTitle>
              <CardDescription>Gemini 2.5 Flash Native</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onGenerate} className="space-y-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g. change paint to matte midnight blue, add bronze 19" wheels, subtle front lip'
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Generating..." : "Generate"}
                  </Button>
                  {error ? (
                    <span className="text-destructive text-sm">{error}</span>
                  ) : null}
                </div>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Uses Gemini image editing per docs/ai-image-generation.txt. All
                outputs include SynthID watermark.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cosmetic Mods</CardTitle>
              <CardDescription>Save prompts and snapshots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <input
                  type="text"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  placeholder="Mod name (e.g., Matte Blue + Bronze Wheels)"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" onClick={saveCurrentAsMod}>
                    Save Mod
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPrompt("")}
                  >
                    Clear prompt
                  </Button>
                </div>

                <div className="mt-2 space-y-2">
                  {mods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved mods yet.
                    </p>
                  ) : (
                    mods.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-md border p-3"
                      >
                        {m.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.signedUrl}
                            alt="mod"
                            className="size-12 rounded object-cover"
                          />
                        ) : (
                          <div className="size-12 rounded bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.prompt}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPrompt(m.prompt)}
                          >
                            Load Prompt
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setPrompt(m.prompt)
                              generateWithPrompt(m.prompt)
                            }}
                          >
                            Generate
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (m.signedUrl) {
                                const dataUrl = await urlToDataUrl(m.signedUrl)
                                setBaseImageDataUrl(dataUrl)
                                setResultBase64(null)
                              }
                            }}
                          >
                            Use as Base
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await supabase.from("mods").delete().eq("id", m.id)
                              await supabase.storage.from("mods").remove([m.image_path])
                              if (userId) loadMods(userId)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Asset</CardTitle>
              <CardDescription>Transparent overlay for drag-and-drop</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Asset name (e.g., Bronze 5-spoke)"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <textarea
                  value={assetPrompt}
                  onChange={(e) => setAssetPrompt(e.target.value)}
                  placeholder="Describe the part; model outputs transparent PNG"
                  className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={useBaseAsRef}
                    onCheckedChange={(v) => setUseBaseAsRef(Boolean(v))}
                  />
                  <span>Use current base image as style reference</span>
                </label>
                <div className="flex items-center gap-3">
                  <Button type="button" onClick={generateAsset} disabled={loading}>
                    {loading ? "Generating..." : "Generate Asset"}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Examples: {CATEGORIES.find((c) => c.key === assetCategory)?.examples.join(", ")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
              <CardDescription>Drag onto the canvas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets yet. Generate one above.</p>
                ) : (
                  assets
                    .filter((a) => a.category === assetCategory)
                    .map((a) => (
                      <div key={a.id} className="flex items-center gap-3 rounded-md border p-2">
                        {a.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.signedUrl}
                            alt={a.name}
                            className="size-12 rounded object-contain bg-muted/30"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/asset-id", a.id)
                              e.dataTransfer.setData("text/asset-url", a.signedUrl || "")
                            }}
                          />
                        ) : (
                          <div className="size-12 rounded bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{a.category}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!a.signedUrl) return
                              const id = `${a.id}-${Date.now()}`
                              const z = (overlays[overlays.length - 1]?.z || 0) + 1
                              setOverlays((prev) => [
                                ...prev,
                                {
                                  id,
                                  assetId: a.id,
                                  url: a.signedUrl!,
                                  x: 0.5,
                                  y: 0.5,
                                  scale: 0.5,
                                  rotation: 0,
                                  z,
                                },
                              ])
                              setSelectedOverlayId(id)
                            }}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await supabase.from("mod_assets").delete().eq("id", a.id)
                              await supabase.storage.from("mod-assets").remove([a.image_path])
                              if (userId) loadAssets(userId)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {selectedOverlay ? (
            <Card>
              <CardHeader>
                <CardTitle>Selected Asset</CardTitle>
                <CardDescription>Adjust transform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm font-medium truncate">{assets.find((a) => a.id === selectedOverlay.assetId)?.name || "Asset"}</div>
                  <label className="block text-sm">Scale</label>
                  <input
                    type="range"
                    min={0.1}
                    max={3}
                    step={0.01}
                    value={selectedOverlay.scale}
                    onChange={(e) =>
                      setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, scale: Number(e.target.value) } : o)))
                    }
                    className="w-full"
                  />
                  <label className="block text-sm">Rotation</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={selectedOverlay.rotation}
                    onChange={(e) =>
                      setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, rotation: Number(e.target.value) } : o)))
                    }
                    className="w-full"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // bring to front
                        const maxZ = overlays.reduce((m, o) => Math.max(m, o.z), 0)
                        setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, z: maxZ + 1 } : o)))
                      }}
                    >
                      Bring to front
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlay.id))
                        setSelectedOverlayId(null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
