"use client";

import dynamic from "next/dynamic";

export type { HeatmapIncident, HeatmapWeightMode, NeshanHeatmapProps } from "./NeshanHeatmapImpl";

// SDK نشان موقع import به window دست می‌زند، پس باید فقط در مرورگر اجرا شود (ssr: false)
export const NeshanHeatmap = dynamic(
  () => import("./NeshanHeatmapImpl").then((mod) => mod.NeshanHeatmap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground"
        style={{ height: "600px" }}
      >
        در حال بارگذاری نقشه حرارتی...
      </div>
    ),
  },
);
