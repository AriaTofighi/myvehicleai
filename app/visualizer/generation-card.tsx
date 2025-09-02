import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  prompt: string
  setPrompt: (v: string) => void
  onGenerate: (e: React.FormEvent) => void
  loading: boolean
  error: string | null
}

export function GenerationCard({ prompt, setPrompt, onGenerate, loading, error }: Props) {
  return (
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
          <p className="text-xs text-muted-foreground">Tip: Leave prompt blank if you dragged assets — we’ll auto‑prompt from them.</p>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Uses Gemini image editing per docs/ai-image-generation.txt. All
          outputs include SynthID watermark.
        </p>
      </CardContent>
    </Card>
  )
}

