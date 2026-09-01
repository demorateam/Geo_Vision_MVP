"use client";

import dynamic from "next/dynamic";

export type { HeatPoint, NeshanHeatmapProps } from "./NeshanHeatmapImpl";

export const NeshanHeatmap = dynamic(
  () => import("./NeshanHeatmapImpl").then((mod) => mod.NeshanHeatmap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground"
        style={{ height: "500px" }}
      >
        در حال بارگذاری نقشه حرارتی...
      </div>
    ),
  },
);