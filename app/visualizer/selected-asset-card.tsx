import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { OverlayItem, ModAssetRow } from "./types"

type Props = {
  overlays: OverlayItem[]
  setOverlays: React.Dispatch<React.SetStateAction<OverlayItem[]>>
  selectedOverlay: OverlayItem
  setSelectedOverlayId: (id: string | null) => void
  assets: ModAssetRow[]
}

export function SelectedAssetCard({ overlays, setOverlays, selectedOverlay, setSelectedOverlayId, assets }: Props) {
  const assetName = assets.find((a) => a.id === selectedOverlay.assetId)?.name || "Asset"
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Asset</CardTitle>
        <CardDescription>Adjust transform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm font-medium truncate">{assetName}</div>
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
  )
}

