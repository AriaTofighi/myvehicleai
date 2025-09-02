"use client";

import { useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { OverlayItem } from "./types"

type Props = {
  canvasImageSrc: string | null
  overlays: OverlayItem[]
  setOverlays: React.Dispatch<React.SetStateAction<OverlayItem[]>>
  selectedOverlayId: string | null
  setSelectedOverlayId: (id: string | null) => void
  resultSrc: string | null
  setBaseImageDataUrl: (v: string) => void
  setResultBase64: (v: string | null) => void
  zoom: number
  setZoom: (z: number | ((prev: number) => number)) => void
}

export function VisualizerCanvas(props: Props) {
  const {
    canvasImageSrc,
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    resultSrc,
    setBaseImageDataUrl,
    setResultBase64,
    zoom,
    setZoom,
  } = props

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    id: string | null
    startX: number
    startY: number
    startPos: { x: number; y: number }
  } | null>(null)
  const transformStateRef = useRef<
    | null
    | {
        type: "resize" | "rotate"
        id: string
        startScale: number
        startRotation: number
        centerX: number
        centerY: number
        startPointerAngle: number
        startPointerDist: number
      }
  >(null)

  const selectedOverlay = useMemo(
    () => overlays.find((o) => o.id === selectedOverlayId) || null,
    [overlays, selectedOverlayId]
  )

  function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!canvasRef.current) return
    const assetId = e.dataTransfer.getData("text/asset-id")
    const url = e.dataTransfer.getData("text/asset-url")
    if (!assetId || !url) return
    const rect = canvasRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const x = Math.max(0, Math.min(1, 0.5 + (e.clientX - cx) / (rect.width * zoom)))
    const y = Math.max(0, Math.min(1, 0.5 + (e.clientY - cy) / (rect.height * zoom)))
    const id = `${assetId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const z = (overlays[overlays.length - 1]?.z || 0) + 1
    const item: OverlayItem = { id, assetId, url, x, y, scale: 0.4, rotation: 0, z }
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
    const dx = (e.clientX - startX) / (rect.width * zoom)
    const dy = (e.clientY - startY) / (rect.height * zoom)
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, x: Math.max(0, Math.min(1, startPos.x + dx)), y: Math.max(0, Math.min(1, startPos.y + dy)) } : o))
    )
  }

  function endOverlayDrag(e?: React.PointerEvent) {
    if (dragStateRef.current) dragStateRef.current = null
    if (e) (e.target as Element).releasePointerCapture?.((e as React.PointerEvent).pointerId)
  }

  function beginResize(e: React.PointerEvent, id: string) {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const ov = overlays.find((o) => o.id === id)
    if (!ov) return
    const centerX = rect.left + ov.x * rect.width
    const centerY = rect.top + ov.y * rect.height
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const dist = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    transformStateRef.current = {
      type: "resize",
      id,
      startScale: ov.scale,
      startRotation: ov.rotation,
      centerX,
      centerY,
      startPointerAngle: ang,
      startPointerDist: dist,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function beginRotate(e: React.PointerEvent, id: string) {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const ov = overlays.find((o) => o.id === id)
    if (!ov) return
    const centerX = rect.left + ov.x * rect.width
    const centerY = rect.top + ov.y * rect.height
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const dist = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    transformStateRef.current = {
      type: "rotate",
      id,
      startScale: ov.scale,
      startRotation: ov.rotation,
      centerX,
      centerY,
      startPointerAngle: ang,
      startPointerDist: dist,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onTransformMove(e: React.PointerEvent) {
    if (!transformStateRef.current) return
    const s = transformStateRef.current
    const dx = e.clientX - s.centerX
    const dy = e.clientY - s.centerY
    const dist = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    if (s.type === "resize") {
      const ratio = dist / Math.max(1, s.startPointerDist)
      const next = Math.max(0.1, Math.min(3, s.startScale * ratio))
      setOverlays((prev) => prev.map((o) => (o.id === s.id ? { ...o, scale: next } : o)))
    } else if (s.type === "rotate") {
      const deltaDeg = ((ang - s.startPointerAngle) * 180) / Math.PI
      const next = s.startRotation + deltaDeg
      setOverlays((prev) => prev.map((o) => (o.id === s.id ? { ...o, rotation: next } : o)))
    }
  }

  function endTransform(e?: React.PointerEvent) {
    if (transformStateRef.current) transformStateRef.current = null
    if (e) (e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  function onCanvasWheel(e: React.WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.max(0.5, Math.min(2, Number((typeof z === "number" ? z : 1) + delta).toFixed(2))))
      return
    }
    if (!selectedOverlay) return
    e.preventDefault()
    if (e.shiftKey) {
      const delta = e.deltaY > 0 ? 5 : -5
      setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, rotation: o.rotation + delta } : o)))
    } else {
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, scale: Math.max(0.1, Math.min(3, o.scale + delta)) } : o)))
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedOverlay) return
      if (e.key === "Delete" || e.key === "Backspace") {
        setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlay.id))
        setSelectedOverlayId(null)
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 0.02 : 0.005
        setOverlays((prev) => prev.map((o) => {
          if (o.id !== selectedOverlay.id) return o
          let nx = o.x, ny = o.y
          if (e.key === "ArrowLeft") nx -= step
          if (e.key === "ArrowRight") nx += step
          if (e.key === "ArrowUp") ny -= step
          if (e.key === "ArrowDown") ny += step
          return { ...o, x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) }
        }))
      } else if (e.key === "+" || e.key === "=") {
        setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, scale: Math.min(3, o.scale + 0.05) } : o)))
      } else if (e.key === "-") {
        setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, scale: Math.max(0.1, o.scale - 0.05) } : o)))
      } else if (e.key.toLowerCase() === "r") {
        setOverlays((prev) => prev.map((o) => (o.id === selectedOverlay.id ? { ...o, rotation: o.rotation + (e.shiftKey ? -15 : 15) } : o)))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedOverlay, setOverlays, setSelectedOverlayId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canvas</CardTitle>
        <CardDescription>Drag assets onto your vehicle</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between pb-2">
          <div className="text-xs text-muted-foreground">Wheel to scale; Shift+Wheel rotate; Ctrl+Wheel zoom</div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.5, Number((typeof z === "number" ? z : 1) - 0.1).toFixed(2)))}>-</Button>
            <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(2, Number((typeof z === "number" ? z : 1) + 0.1).toFixed(2)))}>+</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setZoom(1)}>Reset</Button>
          </div>
        </div>
        <div
          ref={canvasRef}
          className="aspect-video w-full rounded-lg border bg-muted/30 relative overflow-hidden"
          onDrop={onCanvasDrop}
          onDragOver={onCanvasDragOver}
          onWheel={onCanvasWheel}
        >
          <div
            ref={contentRef}
            className="absolute inset-0"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
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

            {overlays.map((o) => (
              <div
                key={o.id}
                className="absolute"
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${o.rotation}deg) scale(${o.scale})`,
                  zIndex: 10 + o.z,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.url}
                  alt="overlay"
                  className={`cursor-move max-w-[60vw] max-h-[60vh] ${selectedOverlayId === o.id ? "outline outline-2 outline-primary/70" : ""}`}
                  onPointerDown={(e) => {
                    setSelectedOverlayId(o.id)
                    beginOverlayDrag(e, o.id)
                  }}
                  onPointerMove={onOverlayDragMove}
                  onPointerUp={endOverlayDrag}
                  draggable={false}
                />

                {selectedOverlayId === o.id ? (
                  <>
                    {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                      <div
                        key={pos}
                        className="absolute size-3 rounded-full bg-primary border border-background"
                        style={{
                          left: pos.includes("l") ? 0 : undefined,
                          right: pos.includes("r") ? 0 : undefined,
                          top: pos.includes("t") ? 0 : undefined,
                          bottom: pos.includes("b") ? 0 : undefined,
                          transform: `translate(${pos.includes("l") ? "-50%" : "50%"}, ${pos.includes("t") ? "-50%" : "50%"})`,
                        }}
                        onPointerDown={(e) => beginResize(e, o.id)}
                        onPointerMove={onTransformMove}
                        onPointerUp={endTransform}
                        title="Resize"
                      />
                    ))}
                    <div
                      className="absolute -top-5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-foreground"
                      onPointerDown={(e) => beginRotate(e, o.id)}
                      onPointerMove={onTransformMove}
                      onPointerUp={endTransform}
                      title="Rotate"
                    />
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setOverlays((prev) => prev.map((x) => (x.id === o.id ? { ...x, rotation: x.rotation - 15 } : x)))}>↺</Button>
                      <Button size="sm" variant="secondary" onClick={() => setOverlays((prev) => prev.map((x) => (x.id === o.id ? { ...x, rotation: x.rotation + 15 } : x)))}>↻</Button>
                      <Button size="sm" variant="secondary" onClick={() => setOverlays((prev) => prev.map((x) => (x.id === o.id ? { ...x, scale: Math.min(3, x.scale + 0.05) } : x)))}>＋</Button>
                      <Button size="sm" variant="secondary" onClick={() => setOverlays((prev) => prev.map((x) => (x.id === o.id ? { ...x, scale: Math.max(0.1, x.scale - 0.05) } : x)))}>－</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setOverlays((prev) => prev.filter((x) => x.id !== o.id)); setSelectedOverlayId(null) }}>Delete</Button>
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
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
  )
}

