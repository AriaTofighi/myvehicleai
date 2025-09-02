import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PresetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Presets</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Reusable configurations for common modification stacks. This page currently
          provides placeholders for list, categories, and details.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Preset {i + 1}</CardTitle>
              <CardDescription>Category • Style</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full rounded-lg border bg-muted/30" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

