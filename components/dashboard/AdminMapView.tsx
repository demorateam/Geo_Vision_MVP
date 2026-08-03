"use client";

import { useState, useMemo } from "react";
import { NeshanMap, type MapMarker } from "@/components/map/NeshanMap";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  incidentNumber: string;
  description: string;
  incidentType: string;
  severity: string;
  colorCode: string;
  status: string;
  region: string;
  aiSummary: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string;
  agencies: { agencyName: string }[];
}

const SEVERITY_HEX: Record<string, string> = {
  Green: "#22c55e",
  Yellow: "#eab308",
  Orange: "#f97316",
  Red: "#ef4444",
};

export function AdminMapView({ incidents }: { incidents: Incident[] }) {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (severityFilter === "ALL" ? incidents : incidents.filter((i) => i.severity === severityFilter)),
    [incidents, severityFilter],
  );

  const markers: MapMarker[] = filtered.map((i) => ({
    id: i.id,
    latitude: i.latitude,
    longitude: i.longitude,
    color: SEVERITY_HEX[i.colorCode] ?? "#3b82f6",
    popup: (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold">{i.incidentNumber}</span>
          <Badge variant="secondary" className="text-xs">{SEVERITY_LABELS[i.severity]}</Badge>
        </div>
        <img src={i.imageUrl} alt="" className="h-24 w-full rounded object-cover" />
        <p className="text-xs">{i.description}</p>
        {i.aiSummary && <p className="rounded bg-slate-50 p-1.5 text-xs text-muted-foreground">{i.aiSummary}</p>}
        <div className="flex flex-wrap gap-1">
          {i.agencies.map((a) => (
            <Badge key={a.agencyName} variant="outline" className="text-xs">{a.agencyName}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{i.region}</span>
          <Badge variant="secondary" className="text-xs">{STATUS_LABELS[i.status]}</Badge>
        </div>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">نقشه رخدادها</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} رخداد روی نقشه</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterButton label="همه" active={severityFilter === "ALL"} onClick={() => setSeverityFilter("ALL")} />
          <FilterButton label="بحرانی" color="#ef4444" active={severityFilter === "Critical"} onClick={() => setSeverityFilter("Critical")} />
          <FilterButton label="زیاد" color="#f97316" active={severityFilter === "High"} onClick={() => setSeverityFilter("High")} />
          <FilterButton label="متوسط" color="#eab308" active={severityFilter === "Medium"} onClick={() => setSeverityFilter("Medium")} />
          <FilterButton label="کم" color="#22c55e" active={severityFilter === "Low"} onClick={() => setSeverityFilter("Low")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2">
              <NeshanMap
                center={{ lat: 35.7219, lng: 51.3347 }}
                zoom={11}
                markers={markers}
                height="600px"
                showSearch
                focusId={selectedId}
                onMarkerClick={(id) => setSelectedId(id)}
              />
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className="lg:col-span-1">
          <CardContent className="max-h-[664px] overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">رخدادی یافت نشد</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => setSelectedId(incident.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border p-2 text-right transition-colors hover:bg-slate-50",
                      selectedId === incident.id ? "border-blue-500 bg-blue-50" : "border-border",
                    )}
                  >
                    <img src={incident.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{incident.incidentNumber}</span>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: SEVERITY_HEX[incident.colorCode] ?? "#3b82f6" }}
                        />
                      </div>
                      <p className="truncate text-xs font-medium">{incident.incidentType}</p>
                      <p className="truncate text-xs text-muted-foreground">{incident.region}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">راهنمای رنگ:</span>
        <LegendItem color="#22c55e" label="کم" />
        <LegendItem color="#eab308" label="متوسط" />
        <LegendItem color="#f97316" label="زیاد" />
        <LegendItem color="#ef4444" label="بحرانی" />
      </div>
    </div>
  );
}

function FilterButton({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
        active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-border bg-white hover:bg-slate-50"
      }`}
    >
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}