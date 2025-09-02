import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI Workflow</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Reference plan for Gemini-powered image generation and editing. The following
          highlights align this UI with future phases.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gemini Capabilities</CardTitle>
            <CardDescription>From docs/ai-image-generation.txt</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Text-to-Image and Text+Image editing</li>
              <li>Multi-image composition and style transfer</li>
              <li>Iterative refinement over multiple turns</li>
              <li>High-fidelity text rendering</li>
              <li>SynthID watermark on generated images</li>
            </ul>
            <p className="mt-4 text-sm">
              See <code>docs/ai-image-generation.txt</code> for API usage samples.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planned Flow</CardTitle>
            <CardDescription>How the editor will use Gemini</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
              <li>Load base vehicle photo (upload)</li>
              <li>Compose cosmetic mods as layers</li>
              <li>Generate preview via Gemini 2.5 Flash</li>
              <li>Iterate with prompt tweaks or layer changes</li>
              <li>Save to gallery, compare, and export</li>
            </ol>
            <p className="mt-4 text-sm">
              For component guidance, see <Link className="underline" href="/">shadcn usage on Home</Link> and
              <code className="ml-1">docs/shadcn.md</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

