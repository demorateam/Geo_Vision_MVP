"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  popup?: ReactNode;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface NeshanMapProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
  showSearch?: boolean;
  /** id of a marker to fly to + auto-open its popup (for linking with an external list) */
  focusId?: string | null;
  /** fired when the user clicks a marker directly on the map */
  onMarkerClick?: (id: string) => void;
}

function coloredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

async function searchAddress(query: string): Promise<{ lat: number; lng: number; label: string }[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=fa&limit=5`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: any) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }));
  } catch {
    return [];
  }
}

function FlyTo({ position }: { position: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);
  return null;
}

export function NeshanMap({
  center,
  zoom = 12,
  markers = [],
  height = "500px",
  showSearch = false,
  focusId = null,
  onMarkerClick,
}: NeshanMapProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState<LatLng | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  useEffect(() => setMounted(true), []);

  // Fly to + open popup when focusId changes (e.g. clicked from an external list)
  useEffect(() => {
    if (!focusId) return;
    const target = markers.find((m) => m.id === focusId);
    if (!target) return;
    const t = setTimeout(() => markerRefs.current[focusId]?.openPopup(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const focusPosition: LatLng | null = focusId
    ? (() => {
        const t = markers.find((m) => m.id === focusId);
        return t ? { lat: t.latitude, lng: t.longitude } : null;
      })()
    : null;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      setSearchResults(await searchAddress(value));
      setSearching(false);
    }, 500);
  };

  const handleSelectResult = (r: { lat: number; lng: number; label: string }) => {
    setSearchTarget({ lat: r.lat, lng: r.lng });
    setSearchQuery(r.label);
    setSearchResults([]);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground" style={{ height }}>
        در حال بارگذاری نقشه...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showSearch && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی مکان روی نقشه..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-9"
            />
            {searching && <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full rounded-lg border bg-white shadow-lg">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="block w-full truncate border-b p-2 text-right text-sm last:border-b-0 hover:bg-slate-50"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border" style={{ height }}>
        <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              icon={coloredIcon(m.color ?? "#3b82f6")}
              ref={(ref) => {
                markerRefs.current[m.id] = ref;
              }}
              eventHandlers={{
                click: () => onMarkerClick?.(m.id),
              }}
            >
              {m.popup && <Popup>{m.popup}</Popup>}
            </Marker>
          ))}
          <FlyTo position={searchTarget ?? focusPosition} />
        </MapContainer>
      </div>
    </div>
  );
}