"use client";
 
import { useEffect, useRef, useState } from "react";
import L from "@neshan-maps-platform/leaflet";
import "@neshan-maps-platform/leaflet/dist/leaflet.css";
import { Search, Locate, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
 
// Leaflet's default marker icon paths break with bundlers (webpack/Next.js).
// Point them at a CDN instead of relying on local static assets.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
 
const NESHAN_MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY || "";
 
interface LatLng {
  lat: number;
  lng: number;
}
 
export interface LocationMapProps {
  center: LatLng;
  selectable?: boolean;
  showSearch?: boolean;
  height?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  onAddressResolve?: (address: string) => void;
}
 
// Geocoding is proxied through the application so provider keys stay on the server.
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.formatted_address ?? data?.address ?? null;
  } catch {
    return null;
  }
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
 
export function LocationMap({
  center,
  selectable = false,
  showSearch = false,
  height = "400px",
  onLocationSelect,
  onAddressResolve,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
 
  const [position, setPosition] = useState<LatLng>(center);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapError, setMapError] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // Keep latest callbacks/props in refs so map event handlers (registered once) always call the current version.
  const onLocationSelectRef = useRef(onLocationSelect);
  const onAddressResolveRef = useRef(onAddressResolve);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    onAddressResolveRef.current = onAddressResolve;
  }, [onLocationSelect, onAddressResolve]);
 
  const updatePositionRef = useRef<(lat: number, lng: number) => void>(() => {});
  updatePositionRef.current = async (lat: number, lng: number) => {
    setPosition({ lat, lng });
    onLocationSelectRef.current?.(lat, lng);
    const address = await reverseGeocode(lat, lng);
    if (address) onAddressResolveRef.current?.(address);
  };
 
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
      center: [position.lat, position.lng],
      zoom: 15,
      poi: true,
      traffic: false,
    } as L.MapOptions);
    mapRef.current = map;
 
    const marker = L.marker([position.lat, position.lng], {
      icon: markerIcon,
      draggable: selectable,
    }).addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      updatePositionRef.current(lat, lng);
    });
    markerRef.current = marker;
 
    if (selectable) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        updatePositionRef.current(e.latlng.lat, e.latlng.lng);
      });
    }
 
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  // Sync marker + fly the map whenever the selected position changes (search, locate-me, drag, click).
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([position.lat, position.lng]);
    mapRef.current.flyTo([position.lat, position.lng], Math.max(mapRef.current.getZoom(), 16));
  }, [position.lat, position.lng]);
 
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("مرورگر شما از GPS پشتیبانی نمی‌کند");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updatePositionRef.current(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        alert("دریافت موقعیت مکانی ناموفق بود. دسترسی GPS را بررسی کنید");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
 
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSearchResults(results);
      setSearching(false);
    }, 500);
  };
 
  const handleSelectResult = (result: { lat: number; lng: number; label: string }) => {
    updatePositionRef.current(result.lat, result.lng);
    onAddressResolveRef.current?.(result.label);
    setSearchQuery(result.label);
    setSearchResults([]);
  };
 
  return (
    <div className="space-y-2">
      {showSearch && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی آدرس..."
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
 
      <div className="relative overflow-hidden rounded-xl border" style={{ height }}>
        {mapError ? (
          <div className="flex h-full items-center justify-center bg-slate-50 p-4 text-center text-sm text-muted-foreground">
            کلید نقشه‌ی نشان تنظیم نشده است (NEXT_PUBLIC_NESHAN_MAP_KEY)
          </div>
        ) : (
          <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
        )}
 
        {selectable && !mapError && (
          <Button
            type="button"
            size="sm"
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute top-3 right-3 z-[1000] gap-2 shadow-lg"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
            موقعیت من
          </Button>
        )}
      </div>
    </div>
  );
}