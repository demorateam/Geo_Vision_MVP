"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import L from "@neshan-maps-platform/leaflet";
import "@neshan-maps-platform/leaflet/dist/leaflet.css";
import { createHeatLayer } from "./heatLayerFactory";
import { computeClusters, mostFrequent, type ClusterPoint } from "./clusterLayerFactory";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/types";

export interface HeatmapIncident {
  id: string;
  incidentNumber: string;
  incidentType: string;
  severity: string;
  colorCode: string;
  status: string;
  region: string;
  description?: string;
  aiSummary?: string | null;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  agencies?: { agencyName: string }[];
}

export type HeatmapWeightMode = "density" | "risk";

export interface NeshanHeatmapProps {
  points: HeatmapIncident[];
  weightMode: HeatmapWeightMode;
  height?: string;
  /** اگر پاس داده شود، دکمه‌ی «مشاهده جزئیات» روی مارکر تکی نمایش داده می‌شود */
  onIncidentClick?: (id: string) => void;
}

const NESHAN_MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY || "";

// آستانه‌های زوم برای سوییچ خودکار بین سه حالت نمایش
const HEATMAP_MAX_ZOOM = 12; // زوم <= 12 → Heatmap (نمای کلی شهر)
const CLUSTER_MAX_ZOOM = 15; // 13 تا 15 → خوشه‌های دایره‌ای؛ بالاتر از 15 → مارکر تکی
const CLUSTER_CELL_PX = 64; // اندازه‌ی هر سلول Grid خوشه‌بندی (پیکسل)

const COLOR_HEX: Record<string, string> = {
  Green: "#22c55e",
  Yellow: "#eab308",
  Orange: "#f97316",
  Red: "#ef4444",
};

const RISK_WEIGHT: Record<string, number> = {
  Green: 1,
  Yellow: 2,
  Orange: 3,
  Red: 4,
};

function scheduleUnmount(root: Root) {
  setTimeout(() => root.unmount(), 0);
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

function clusterIcon(color: string, count: number) {
  const size = count >= 50 ? 52 : count >= 20 ? 44 : count >= 10 ? 38 : 32;
  const fontSize = size > 40 ? 14 : 12;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}cc;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${fontSize}px;">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function NeshanHeatmap({ points, weightMode, height = "600px", onIncidentClick }: NeshanHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlayGroupRef = useRef<any>(null);
  const popupRootsRef = useRef<Root[]>([]);

  const modeRef = useRef<"heatmap" | "cluster" | "markers">("heatmap");
  const pointsRef = useRef<HeatmapIncident[]>(points);
  const weightModeRef = useRef<HeatmapWeightMode>(weightMode);
  const onIncidentClickRef = useRef(onIncidentClick);

  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    weightModeRef.current = weightMode;
  }, [weightMode]);

  useEffect(() => {
    onIncidentClickRef.current = onIncidentClick;
  }, [onIncidentClick]);

  function clearHeat() {
    if (mapRef.current && heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
    }
    heatLayerRef.current = null;
  }

  function clearOverlayGroup() {
    if (overlayGroupRef.current) {
      popupRootsRef.current.forEach(scheduleUnmount);
      popupRootsRef.current = [];
      overlayGroupRef.current.clearLayers();
    }
  }

  // --- حالت ۱: Heatmap (نمای کلی شهر) ---
  function buildHeat() {
    const map = mapRef.current;
    if (!map) return;
    clearOverlayGroup();
    clearHeat();

    const pts = pointsRef.current;
    const mode = weightModeRef.current;
    const heatData: [number, number, number][] = pts.map((p) => [
      p.latitude,
      p.longitude,
      mode === "density" ? 1 : (RISK_WEIGHT[p.colorCode] ?? 1) / 4,
    ]);

    const heatLayer = createHeatLayer(L, heatData, {
      radius: 30,
      blur: 22,
      minZoom: 5,
      gradient: {
        0.2: "#22c55e",
        0.4: "#eab308",
        0.65: "#f97316",
        0.9: "#ef4444",
      },
    });
    heatLayer.addTo(map);
    heatLayerRef.current = heatLayer;
  }

  // --- حالت ۲: خوشه‌های دایره‌ای با عدد ---
  function buildClusters() {
    const map = mapRef.current;
    if (!map || !overlayGroupRef.current) return;
    clearHeat();
    clearOverlayGroup();

    const pts = pointsRef.current;
    const clusterInput: ClusterPoint[] = pts.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      colorCode: p.colorCode,
      incidentType: p.incidentType,
      status: p.status,
      region: p.region,
    }));

    const buckets = computeClusters(map, clusterInput, CLUSTER_CELL_PX);

    buckets.forEach((bucket) => {
      const marker = L.marker([bucket.lat, bucket.lng], {
        icon: clusterIcon(COLOR_HEX[bucket.dominantColor] ?? "#3b82f6", bucket.count),
      });

      const criticalCount = bucket.points.filter((p) => p.colorCode === "Red").length;
      const topType = mostFrequent(bucket.points.map((p) => p.incidentType));
      const topStatus = mostFrequent(bucket.points.map((p) => p.status));
      const regions = Array.from(new Set(bucket.points.map((p) => p.region)));
      const regionLabel = regions.length === 1 ? regions[0] : `${regions.length} منطقه`;

      const container = document.createElement("div");
      const root = createRoot(container);
      root.render(
        <div className="space-y-2 text-xs">
          <p className="text-sm font-bold">{bucket.count} رخداد در این محدوده</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">بحرانی: {criticalCount}</Badge>
            <Badge variant="outline">رایج‌ترین نوع: {topType}</Badge>
          </div>
          <p className="text-muted-foreground">وضعیت غالب: {STATUS_LABELS[topStatus] ?? topStatus}</p>
          <p className="text-muted-foreground">منطقه: {regionLabel}</p>
          <button
            type="button"
            className="w-full rounded-lg bg-blue-600 px-2 py-1.5 text-white hover:bg-blue-700"
            onClick={() => {
              const b = L.latLngBounds(bucket.points.map((p) => [p.latitude, p.longitude] as [number, number]));
              mapRef.current?.fitBounds(b, { padding: [60, 60], maxZoom: 18 });
            }}
          >
            نمایش رخدادهای این محدوده
          </button>
        </div>,
      );
      popupRootsRef.current.push(root);
      marker.bindPopup(container);
      marker.addTo(overlayGroupRef.current);
    });
  }

  // --- حالت ۳: مارکر تکی رخداد (زوم نزدیک) ---
  function buildMarkers() {
    const map = mapRef.current;
    if (!map || !overlayGroupRef.current) return;
    clearHeat();
    clearOverlayGroup();

    const pts = pointsRef.current;
    pts.forEach((p) => {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: markerIcon(COLOR_HEX[p.colorCode] ?? "#3b82f6"),
      });

      const container = document.createElement("div");
      const root = createRoot(container);
      root.render(
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold">{p.incidentNumber}</span>
            <Badge variant="secondary">{SEVERITY_LABELS[p.severity] ?? p.severity}</Badge>
          </div>
          {p.imageUrl && <img src={p.imageUrl} alt="" className="h-20 w-full rounded object-cover" />}
          {p.description && <p>{p.description}</p>}
          {p.aiSummary && <p className="rounded bg-slate-50 p-1.5 text-muted-foreground">{p.aiSummary}</p>}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{p.region}</span>
            <Badge variant="secondary">{STATUS_LABELS[p.status] ?? p.status}</Badge>
          </div>
          {onIncidentClickRef.current && (
            <button
              type="button"
              className="w-full rounded-lg border px-2 py-1.5 hover:bg-slate-50"
              onClick={() => onIncidentClickRef.current?.(p.id)}
            >
              مشاهده جزئیات
            </button>
          )}
        </div>,
      );
      popupRootsRef.current.push(root);
      marker.bindPopup(container);
      marker.addTo(overlayGroupRef.current);
    });
  }

  function renderForCurrentZoom() {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom();
    const mode: "heatmap" | "cluster" | "markers" =
      zoom <= HEATMAP_MAX_ZOOM ? "heatmap" : zoom <= CLUSTER_MAX_ZOOM ? "cluster" : "markers";
    modeRef.current = mode;

    if (mode === "heatmap") buildHeat();
    else if (mode === "cluster") buildClusters();
    else buildMarkers();
  }

  function handleZoomEnd() {
    renderForCurrentZoom();
  }

  function handleMoveEnd() {
    // فقط در حالت خوشه‌بندی، جابه‌جایی نقشه باعث تغییر گروه‌بندی پیکسلی می‌شود
    if (modeRef.current === "cluster") buildClusters();
  }

  // ساخت نقشه فقط یک‌بار
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!NESHAN_MAP_KEY) {
      setMapError(true);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new (L as any).Map(mapContainerRef.current, {
      key: NESHAN_MAP_KEY,
      maptype: "standard-day",
      center: [35.7219, 51.3347],
      zoom: 11,
      poi: true,
      traffic: false,
    });
    mapRef.current = map;
    overlayGroupRef.current = L.layerGroup().addTo(map);

    map.on("zoomend", handleZoomEnd);
    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("zoomend", handleZoomEnd);
      map.off("moveend", handleMoveEnd);
      popupRootsRef.current.forEach(scheduleUnmount);
      popupRootsRef.current = [];
      map.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
      overlayGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // هر بار فیلترها/points یا حالت تحلیل (تراکم/ریسک) عوض شد:
  // fitBounds خودکار روی همه‌ی نقاط قابل‌مشاهده + رندر مجدد بر اساس زوم فعلی
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
    renderForCurrentZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, weightMode]);

  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      {mapError ? (
        <div className="flex h-full items-center justify-center bg-slate-50 p-4 text-center text-sm text-muted-foreground">
          کلید نقشه‌ی نشان تنظیم نشده است (NEXT_PUBLIC_NESHAN_MAP_KEY)
        </div>
      ) : (
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
      )}
    </div>
  );
}
