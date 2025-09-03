import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OverlayItem, ModAssetRow } from "./types"

type Props = {
  overlays: OverlayItem[]
  setOverlays: React.Dispatch<React.SetStateAction<OverlayItem[]>>
  assets: ModAssetRow[]
  selectedOverlayId: string | null
  setSelectedOverlayId: (id: string | null) => void
}

export function LayersCard({ overlays, setOverlays, assets, selectedOverlayId, setSelectedOverlayId }: Props) {
  const sorted = [...overlays].sort((a, b) => a.z - b.z)

  function move(id: string, dir: -1 | 1) {
    // swap z with neighbor in sorted order
    const idx = sorted.findIndex((o) => o.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[j]
    setOverlays((prev) => prev.map((o) => (o.id === a.id ? { ...o, z: b.z } : o.id === b.id ? { ...o, z: a.z } : o)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layers</CardTitle>
        <CardDescription>Reorder and toggle overlays</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overlays.</p>
          ) : (
            sorted.map((o, i) => {
              const asset = assets.find((a) => a.id === o.assetId)
              return (
                <div key={o.id} className={`flex items-center gap-2 rounded-md border p-2 ${selectedOverlayId === o.id ? "ring-1 ring-primary/60" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.url} alt="overlay" className="size-10 rounded object-contain bg-muted/30" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{asset?.name || "Overlay"}</div>
                    <div className="text-xs text-muted-foreground truncate">z {o.z}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => move(o.id, -1)} disabled={i === 0}>Up</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => move(o.id, 1)} disabled={i === sorted.length - 1}>Down</Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={o.hidden ? "outline" : "ghost"}
                      onClick={() => setOverlays((prev) => prev.map((x) => (x.id === o.id ? { ...x, hidden: !x.hidden } : x)))}
                    >
                      {o.hidden ? "Show" : "Hide"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedOverlayId(o.id)}>Select</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOverlays((prev) => prev.filter((x) => x.id !== o.id))}>Delete</Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

