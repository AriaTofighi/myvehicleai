import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ModRow } from "./types"

type Props = {
  modName: string
  setModName: (v: string) => void
  mods: ModRow[]
  onSaveMod: () => void
  onLoadPrompt: (prompt: string) => void
  onGenerateFromPrompt: (prompt: string) => void
  onUseAsBase: (m: ModRow) => Promise<void>
  onDeleteMod: (m: ModRow) => Promise<void>
}

export function ModsCard({
  modName,
  setModName,
  mods,
  onSaveMod,
  onLoadPrompt,
  onGenerateFromPrompt,
  onUseAsBase,
  onDeleteMod,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cosmetic Mods</CardTitle>
        <CardDescription>Save prompts and snapshots</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <input
            type="text"
            value={modName}
            onChange={(e) => setModName(e.target.value)}
            placeholder="Mod name (e.g., Matte Blue + Bronze Wheels)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={onSaveMod}>
              Save Mod
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onLoadPrompt("")}
            >
              Clear prompt
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            {mods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved mods yet.
              </p>
            ) : (
              mods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  {m.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.signedUrl}
                      alt="mod"
                      className="size-12 rounded object-cover"
                    />
                  ) : (
                    <div className="size-12 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.prompt}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onLoadPrompt(m.prompt)}
                    >
                      Load Prompt
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onGenerateFromPrompt(m.prompt)}
                    >
                      Generate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onUseAsBase(m)}
                    >
                      Use as Base
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteMod(m)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

