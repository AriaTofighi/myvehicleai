import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Design vehicle cosmetic mods with AI</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          MyVehicleAI helps you visualize wheels, paint, vinyls, aero kits, and more.
          Start with a photo, compose cosmetic changes, and generate previews powered by Gemini.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/visualizer">Open Visualizer</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs">AI Workflow</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Visualizer</CardTitle>
            <CardDescription>Core editor layout and flow</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload, arrange cosmetic mods, and preview results. Drag-and-drop and AI
              integration will be added in a future phase.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Presets</CardTitle>
            <CardDescription>Reusable mod configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Save and apply preset combinations like wheel + color + kit to speed up iteration.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gallery</CardTitle>
            <CardDescription>Compare and share outputs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Browse generated previews, compare variants side-by-side, and export your favorites.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
