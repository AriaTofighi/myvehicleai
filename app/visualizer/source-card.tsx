import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  progressive: boolean
  setProgressive: (v: boolean) => void
  onSelectFile: (f: File | null) => void
}

export function SourceCard({ progressive, setProgressive, onSelectFile }: Props) {
  return (
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
  )
}

