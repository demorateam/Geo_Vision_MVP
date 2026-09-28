"use client";

import { useMemo, useState } from "react";
import { NeshanHeatmap, type HeatmapIncident, type HeatmapWeightMode } from "@/components/map/NeshanHeatmap";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/types";
import { X } from "lucide-react";

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
  createdAt: string;
  agencies: { agencyName: string }[];
}

type TimeRange = "today" | "7d" | "30d" | "all";

const COLOR_HEX: Record<string, string> = {
  Green: "#22c55e",
  Yellow: "#eab308",
  Orange: "#f97316",
  Red: "#ef4444",
};

// حداقل تعداد رخداد در یک منطقه تا «داغ» محسوب شود
const HOT_REGION_THRESHOLD = 3;

function isWithinRange(createdAt: string, range: TimeRange): boolean {
  if (range === "all") return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (range === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return created >= startOfToday.getTime();
  }
  if (range === "7d") return created >= now - 7 * day;
  if (range === "30d") return created >= now - 30 * day;
  return true;
}

export function AdminHeatmapView({ incidents }: { incidents: Incident[] }) {
  const [weightMode, setWeightMode] = useState<HeatmapWeightMode>("density");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [severity, setSeverity] = useState<string>("ALL"); // Low | Medium | High | Critical
  const [status, setStatus] = useState<string>("ALL");
  const [incidentType, setIncidentType] = useState<string>("ALL");
  const [region, setRegion] = useState<string>("ALL");
  const [agency, setAgency] = useState<string>("ALL");

  const statusOptions = useMemo(() => Array.from(new Set(incidents.map((i) => i.status))), [incidents]);
  const typeOptions = useMemo(() => Array.from(new Set(incidents.map((i) => i.incidentType))), [incidents]);
  const regionOptions = useMemo(() => Array.from(new Set(incidents.map((i) => i.region))), [incidents]);
  const agencyOptions = useMemo(
    () => Array.from(new Set(incidents.flatMap((i) => i.agencies.map((a) => a.agencyName)))),
    [incidents],
  );

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (!isWithinRange(i.createdAt, timeRange)) return false;
      if (severity !== "ALL" && i.severity !== severity) return false;
      if (status !== "ALL" && i.status !== status) return false;
      if (incidentType !== "ALL" && i.incidentType !== incidentType) return false;
      if (region !== "ALL" && i.region !== region) return false;
      if (agency !== "ALL" && !i.agencies.some((a) => a.agencyName === agency)) return false;
      return true;
    });
  }, [incidents, timeRange, severity, status, incidentType, region, agency]);

  const heatmapPoints: HeatmapIncident[] = filtered;

  const stats = useMemo(() => {
    const regionCounts: Record<string, number> = {};
    filtered.forEach((i) => {
      regionCounts[i.region] = (regionCounts[i.region] ?? 0) + 1;
    });

    const hotRegions = Object.values(regionCounts).filter((c) => c >= HOT_REGION_THRESHOLD).length;

    let topRegion = "-";
    let topRegionCount = 0;
    Object.entries(regionCounts).forEach(([r, c]) => {
      if (c > topRegionCount) {
        topRegionCount = c;
        topRegion = r;
      }
    });

    const criticalCount = filtered.filter((i) => i.colorCode === "Red").length;

    return { total: filtered.length, hotRegions, criticalCount, topRegion };
  }, [filtered]);

  const hasActiveFilters =
    timeRange !== "all" ||
    severity !== "ALL" ||
    status !== "ALL" ||
    incidentType !== "ALL" ||
    region !== "ALL" ||
    agency !== "ALL";

  const clearFilters = () => {
    setTimeRange("all");
    setSeverity("ALL");
    setStatus("ALL");
    setIncidentType("ALL");
    setRegion("ALL");
    setAgency("ALL");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">نقشه حرارتی</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} رخداد در محاسبه</p>
      </div>

      {/* کارت‌های مدیریتی */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="رخدادهای نمایش‌داده‌شده" value={stats.total} />
        <StatCard label="مناطق داغ" value={stats.hotRegions} />
        <StatCard label="رخدادهای بحرانی" value={stats.criticalCount} accent="#ef4444" />
        <StatCard label="پرتراکم‌ترین منطقه" value={stats.topRegion} isText />
      </div>

      {/* حالت تحلیل: تراکم یا ریسک */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">نمایش بر اساس:</span>
        <ModeButton label="تراکم رخدادها" active={weightMode === "density"} onClick={() => setWeightMode("density")} />
        <ModeButton label="ریسک شهری" active={weightMode === "risk"} onClick={() => setWeightMode("risk")} />
      </div>

      {/* فیلترها */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            <ModeButton label="امروز" active={timeRange === "today"} onClick={() => setTimeRange("today")} small />
            <ModeButton label="۷ روز" active={timeRange === "7d"} onClick={() => setTimeRange("7d")} small />
            <ModeButton label="۳۰ روز" active={timeRange === "30d"} onClick={() => setTimeRange("30d")} small />
            <ModeButton label="همه" active={timeRange === "all"} onClick={() => setTimeRange("all")} small />
          </div>

          <SelectFilter
            label="شدت"
            value={severity}
            onChange={setSeverity}
            options={[
              { value: "ALL", label: "همه شدت‌ها" },
              { value: "Low", label: SEVERITY_LABELS["Low"] ?? "کم" },
              { value: "Medium", label: SEVERITY_LABELS["Medium"] ?? "متوسط" },
              { value: "High", label: SEVERITY_LABELS["High"] ?? "زیاد" },
              { value: "Critical", label: SEVERITY_LABELS["Critical"] ?? "بحرانی" },
            ]}
          />

          <SelectFilter
            label="وضعیت"
            value={status}
            onChange={setStatus}
            options={[
              { value: "ALL", label: "همه وضعیت‌ها" },
              ...statusOptions.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
            ]}
          />

          <SelectFilter
            label="نوع رخداد"
            value={incidentType}
            onChange={setIncidentType}
            options={[{ value: "ALL", label: "همه انواع" }, ...typeOptions.map((t) => ({ value: t, label: t }))]}
          />

          <SelectFilter
            label="منطقه"
            value={region}
            onChange={setRegion}
            options={[{ value: "ALL", label: "همه مناطق" }, ...regionOptions.map((r) => ({ value: r, label: r }))]}
          />

          <SelectFilter
            label="سازمان"
            value={agency}
            onChange={setAgency}
            options={[{ value: "ALL", label: "همه سازمان‌ها" }, ...agencyOptions.map((a) => ({ value: a, label: a }))]}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" />
              پاک‌کردن فیلترها
            </button>
          )}
        </CardContent>
      </Card>

      {/* نقشه: Heatmap در نمای کلی → خوشه در زوم متوسط → مارکر رخداد در زوم نزدیک */}
      <Card>
        <CardContent className="p-2">
          <NeshanHeatmap points={heatmapPoints} weightMode={weightMode} height="620px" />
        </CardContent>
      </Card>

      {/* راهنمای رنگ */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">راهنمای رنگ:</span>
        <LegendItem color={COLOR_HEX.Green} label="پایین" />
        <LegendItem color={COLOR_HEX.Yellow} label="متوسط" />
        <LegendItem color={COLOR_HEX.Orange} label="بالا" />
        <LegendItem color={COLOR_HEX.Red} label="بسیار بالا" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  isText,
}: {
  label: string;
  value: number | string;
  accent?: string;
  isText?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={isText ? "truncate text-base font-bold" : "text-xl font-bold"}
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ModeButton({
  label,
  active,
  onClick,
  small,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border transition-colors ${small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${
        active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-border bg-white hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border bg-white px-2 py-1.5 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
