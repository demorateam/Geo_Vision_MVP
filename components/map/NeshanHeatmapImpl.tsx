"use client";

import { useEffect, useRef, useState } from "react";
import L from "@neshan-maps-platform/leaflet";
import "@neshan-maps-platform/leaflet/dist/leaflet.css";
import { createHeatLayer } from "./heatLayerFactory";

export interface HeatPoint {
  latitude: number;
  longitude: number;
  /** 0 تا 1 — شدت وزن این نقطه در هیت‌مپ (مثلاً بر اساس severity) */
  intensity?: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

export interface NeshanHeatmapProps {
  center: LatLng;
  zoom?: number;
  points: HeatPoint[];
  height?: string;
  /** شعاع هر نقطه به پیکسل */
  radius?: number;
  /** میزان بلور/محو شدن لبه‌ها */
  blur?: number;
  maxZoom?: number;
}

const NESHAN_MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY || "";

export function NeshanHeatmap({
  center,
  zoom = 11,
  points,
  height = "500px",
  radius = 28,
  blur = 20,
  maxZoom = 17,
}: NeshanHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);

  const [mapError, setMapError] = useState(false);

  // ساخت نقشه فقط یک‌بار
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!NESHAN_MAP_KEY) {
      setMapError(true);
      return;
    }

    const map = new L.Map(mapContainerRef.current, {
      key: NESHAN_MAP_KEY,
      maptype: "standard-day",
      center: [center.lat, center.lng],
      zoom,
      poi: true,
      traffic: false,
    } as L.MapOptions);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ساخت/به‌روزرسانی لایه‌ی حرارتی هرگاه نقاط تغییر کنن
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const heatData: [number, number, number][] = points.map((p) => [
      p.latitude,
      p.longitude,
      p.intensity ?? 0.5,
    ]);

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    const heatLayer = createHeatLayer(L, heatData, {
      radius,
      blur,
      maxZoom,
      gradient: {
        0.2: "#22c55e",
        0.4: "#eab308",
        0.6: "#f97316",
        0.9: "#ef4444",
      },
    });

    heatLayer.addTo(map);
    heatLayerRef.current = heatLayer;

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, radius, blur, maxZoom]);

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