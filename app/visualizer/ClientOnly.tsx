"use client";

import dynamic from "next/dynamic";

const Visualizer = dynamic(() => import("./VisualizerClient"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Visualizer</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">Loading…</p>
      </div>
    </div>
  ),
});

export default function ClientOnlyVisualizer() {
  return <Visualizer />
}

