import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  mode: "integrate" | "prompt"
  setMode: (m: "integrate" | "prompt") => void
  prompt: string
  setPrompt: (v: string) => void
  onIntegrate: () => void
  onGenerateText: () => void
  loading: boolean
  error: string | null
  disabled?: boolean
}

export function GenerationCard({ mode, setMode, prompt, setPrompt, onIntegrate, onGenerateText, loading, error, disabled }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate</CardTitle>
        <CardDescription>Integrate overlays or run a text prompt</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="inline-flex rounded-md border bg-background p-1 text-xs">
            <Button type="button" variant={mode === "integrate" ? "default" : "ghost"} size="sm" onClick={() => setMode("integrate")}>Integrate</Button>
            <Button type="button" variant={mode === "prompt" ? "default" : "ghost"} size="sm" onClick={() => setMode("prompt")}>Text Prompt</Button>
          </div>

          {mode === "integrate" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button type="button" onClick={onIntegrate} disabled={loading || disabled}>
                  {loading ? "Integrating..." : "Integrate"}
                </Button>
                {error ? (
                  <span className="text-destructive text-sm">{error}</span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Drag parts onto the canvas, adjust position/size/rotation, then click Integrate.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g. change paint to matte midnight blue, add bronze 19" wheels, subtle front lip'
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-3">
                <Button type="button" onClick={onGenerateText} disabled={loading}>
                  {loading ? "Generating..." : "Generate"}
                </Button>
                {error ? (
                  <span className="text-destructive text-sm">{error}</span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Tip: You can still drag assets; they will be used as references.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
