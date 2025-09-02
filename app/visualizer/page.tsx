import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VisualizerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Visualizer</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          This is the core editor surface. For this phase we set up the layout only.
          Drag-and-drop and Gemini-powered generation will be added later.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
            <CardDescription>Vehicle image preview area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg border bg-muted/30" />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
              <CardDescription>Base vehicle photo</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Placeholder for image upload</li>
                <li>EXIF, resolution, and crop helpers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cosmetic Mods</CardTitle>
              <CardDescription>Stack and order modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Wheels, paint, vinyls, aero, lighting</li>
                <li>Drag-and-drop ordering (future)</li>
                <li>Prompt hints per layer (future)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Generation</CardTitle>
              <CardDescription>Gemini 2.5 Flash Native</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Text-to-image and editing flows</li>
                <li>SynthID watermarking</li>
                <li>Iterative refinement</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

