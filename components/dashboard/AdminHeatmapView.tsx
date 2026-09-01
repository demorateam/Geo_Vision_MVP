"use client";

import { useMemo } from "react";
import { NeshanHeatmap, type HeatPoint } from "@/components/map/NeshanHeatmap";
import { Card, CardContent } from "@/components/ui/card";

interface Incident {
  id: string;
  colorCode: string;
  latitude: number;
  longitude: number;
}

const COLOR_INTENSITY: Record<string, number> = {
  Green: 0.2,
  Yellow: 0.45,
  Orange: 0.7,
  Red: 1.0,
};

export function AdminHeatmapView({ incidents }: { incidents: Incident[] }) {
  const points: HeatPoint[] = useMemo(
    () =>
      incidents.map((i) => ({
        latitude: i.latitude,
        longitude: i.longitude,
        intensity: COLOR_INTENSITY[i.colorCode] ?? 0.5,
      })),
    [incidents],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">نقشه حرارتی</h1>
        <p className="text-sm text-muted-foreground">{incidents.length} رخداد در محاسبه تراکم</p>
      </div>

      <Card>
        <CardContent className="p-2">
          <NeshanHeatmap
            center={{ lat: 35.7219, lng: 51.3347 }}
            zoom={11}
            points={points}
            height="650px"
          />
        </CardContent>
      </Card>
    </div>
  );
}