import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Browse generated previews and compare variants. This page currently shows
          placeholders for grid items.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Result {i + 1}</CardTitle>
              <CardDescription>Vehicle • Style</CardDescription>
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

