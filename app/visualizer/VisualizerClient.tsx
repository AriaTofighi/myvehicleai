"use client";

import { useEffect, useMemo, useState } from "react";
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
      } catch (e: any) {
        setError(e?.message || "Could not read file");
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

  // Auth + mods bootstrap
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) loadMods(uid)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const uid = sess?.user?.id ?? null
      setUserId(uid)
      if (uid) loadMods(uid)
      else setMods([])
    })
    return () => {
      mounted = false
      sub.subscription?.unsubscribe()
    }
  }, [supabase])

  async function loadMods(uid: string) {
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
    } catch (err: any) {
      setError(err?.message || "Failed to generate image");
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
    } catch (e: any) {
      setError(e?.message || "Failed to save mod")
    } finally {
      setLoading(false)
    }
  }

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
            <CardDescription>Vehicle image preview area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg border bg-muted/30 grid place-items-center overflow-hidden">
              {canvasImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={canvasImageSrc}
                  alt="Canvas preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Upload an image to preview it here
                </p>
              )}
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
        </div>
      </div>
    </div>
  );
}
