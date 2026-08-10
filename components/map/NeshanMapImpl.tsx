"use client";
 
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import L from "@neshan-maps-platform/leaflet";
import "@neshan-maps-platform/leaflet/dist/leaflet.css";
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
 
export interface NeshanMapProps {
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
 
const NESHAN_MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY || "";
 
// React refuses to unmount a root synchronously while another render is in progress
// (which happens here because we call this from inside another component's effect).
// Deferring to the next tick avoids the "Attempted to synchronously unmount a root..." error.
function scheduleUnmount(root: Root) {
  setTimeout(() => root.unmount(), 0);
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
    const res = await fetch(`/api/search-location?term=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: { title?: string; address?: string; location: { x: number; y: number } }) => ({
      lat: item.location.y,
      lng: item.location.x,
      label: item.address || item.title || "نتیجه جستجو",
    }));
  } catch {
    return [];
  }
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const popupRootsRef = useRef<Root[]>([]);
 
  const [mapError, setMapError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // Keep the latest callback in a ref so marker click handlers (registered imperatively) always call the current version.
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);
 
  // Create the map once, on mount.
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
    layerGroupRef.current = L.layerGroup().addTo(map);
 
    return () => {
      popupRootsRef.current.forEach(scheduleUnmount);
      popupRootsRef.current = [];
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      markerRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  // Rebuild all markers whenever the list changes.
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
 
    popupRootsRef.current.forEach(scheduleUnmount);
    popupRootsRef.current = [];
    layerGroupRef.current.clearLayers();
    markerRefs.current = {};
 
    markers.forEach((m) => {
      const marker = L.marker([m.latitude, m.longitude], {
        icon: coloredIcon(m.color ?? "#3b82f6"),
      });
 
      if (m.popup) {
        const container = document.createElement("div");
        const root = createRoot(container);
        root.render(m.popup);
        popupRootsRef.current.push(root);
        marker.bindPopup(container);
      }
 
      marker.on("click", () => onMarkerClickRef.current?.(m.id));
      marker.addTo(layerGroupRef.current!);
      markerRefs.current[m.id] = marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);
 
  // Fly to + open popup when focusId changes (e.g. clicked from an external list)
  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const target = markers.find((m) => m.id === focusId);
    if (!target) return;
    mapRef.current.flyTo([target.latitude, target.longitude], Math.max(mapRef.current.getZoom(), 15));
    const t = setTimeout(() => markerRefs.current[focusId]?.openPopup(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);
 
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
    if (mapRef.current) {
      mapRef.current.flyTo([r.lat, r.lng], Math.max(mapRef.current.getZoom(), 15));
    }
    setSearchQuery(r.label);
    setSearchResults([]);
  };
 
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
              {searchResults.map((r) => (
                <button
                  key={`${r.lat}-${r.lng}-${r.label}`}
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
        {mapError ? (
          <div className="flex h-full items-center justify-center bg-slate-50 p-4 text-center text-sm text-muted-foreground">
            کلید نقشه‌ی نشان تنظیم نشده است (NEXT_PUBLIC_NESHAN_MAP_KEY)
          </div>
        ) : (
          <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
        )}
      </div>
    </div>
  );
}