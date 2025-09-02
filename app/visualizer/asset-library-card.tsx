import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ModAssetRow } from "./types"

type Props = {
  assets: ModAssetRow[]
  assetCategory: string
  onAddFromAsset: (a: ModAssetRow) => void
  onDeleteAsset: (a: ModAssetRow) => Promise<void>
}

export function AssetLibraryCard({ assets, assetCategory, onAddFromAsset, onDeleteAsset }: Props) {
  const filtered = assets.filter((a) => a.category === assetCategory)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
        <CardDescription>Drag onto the canvas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet. Generate one above.</p>
          ) : (
            filtered.map((a) => (
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
                    onDoubleClick={() => onAddFromAsset(a)}
                    title="Drag to canvas or double‑click to add"
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
                    onClick={() => onAddFromAsset(a)}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteAsset(a)}
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
  )
}

