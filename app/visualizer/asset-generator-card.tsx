import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Category = { key: string; label: string; examples: string[] }

type Props = {
  categories: Category[]
  assetCategory: string
  setAssetCategory: (v: string) => void
  assetName: string
  setAssetName: (v: string) => void
  assetPrompt: string
  setAssetPrompt: (v: string) => void
  useBaseAsRef: boolean
  setUseBaseAsRef: (v: boolean) => void
  onGenerateAsset: () => void
  loading: boolean
}

export function AssetGeneratorCard({
  categories,
  assetCategory,
  setAssetCategory,
  assetName,
  setAssetName,
  assetPrompt,
  setAssetPrompt,
  useBaseAsRef,
  setUseBaseAsRef,
  onGenerateAsset,
  loading,
}: Props) {
  const example = categories.find((c) => c.key === assetCategory)?.examples.join(", ")
  return (
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
            {categories.map((c) => (
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
            <Button type="button" onClick={onGenerateAsset} disabled={loading}>
              {loading ? "Generating..." : "Generate Asset"}
            </Button>
            <div className="text-xs text-muted-foreground">
              Examples: {example}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

