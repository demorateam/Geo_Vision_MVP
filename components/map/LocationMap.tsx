"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

interface LatLng {
  lat: number;
  lng: number;
}

interface LocationMapProps {
  center: LatLng;
  selectable?: boolean;
  showSearch?: boolean;
  height?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  onAddressResolve?: (address: string) => void;
}

// Reverse geocoding: coordinates -> human-readable address (free, via OSM Nominatim)
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fa`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

// Forward geocoding: address text -> coordinates (free, via OSM Nominatim)
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

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]);
  return null;
}

export function LocationMap({
  center,
  selectable = false,
  showSearch = false,
  height = "400px",
  onLocationSelect,
  onAddressResolve,
}: LocationMapProps) {
  const [position, setPosition] = useState<LatLng>(center);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const updatePosition = async (lat: number, lng: number) => {
    setPosition({ lat, lng });
    onLocationSelect?.(lat, lng);
    const address = await reverseGeocode(lat, lng);
    if (address) onAddressResolve?.(address);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("مرورگر شما از GPS پشتیبانی نمی‌کند");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updatePosition(pos.coords.latitude, pos.coords.longitude);
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
    updatePosition(result.lat, result.lng);
    onAddressResolve?.(result.label);
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

      <div className="relative overflow-hidden rounded-xl border" style={{ height }}>
        <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[position.lat, position.lng]}
            icon={markerIcon}
            draggable={selectable}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const { lat, lng } = marker.getLatLng();
                updatePosition(lat, lng);
              },
            }}
          />
          {selectable && <ClickHandler onSelect={updatePosition} />}
          <FlyTo position={position} />
        </MapContainer>

        {selectable && (
          <Button
            type="button"
            size="sm"
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute bottom-3 left-3 z-[1000] gap-2 shadow-lg"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
            موقعیت من
          </Button>
        )}
      </div>
    </div>
  );
}