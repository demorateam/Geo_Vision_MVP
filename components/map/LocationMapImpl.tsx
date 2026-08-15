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
  onAddressResolve?: (address: string, region: string | null) => void;
}

interface ReverseGeocodeResult {
  address: string | null;
  region: string | null;
}

function normalizeMunicipalityZone(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const match = normalized.match(/\d{1,2}/);
  if (!match) return null;

  const zone = Number(match[0]);
  if (!Number.isInteger(zone) || zone < 1 || zone > 22) return null;

  return `منطقه ${new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(zone)}`;
}

// Geocoding is proxied through the application so provider keys stay on the server.
async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    if (!res.ok) return { address: null, region: null };
    const data = await res.json();
    return {
      address: data?.formatted_address ?? data?.address ?? null,
      // municipality_zone is the municipality region. `district` means a
      // country subdivision in Neshan's response and must not be used here.
      region: normalizeMunicipalityZone(data?.municipality_zone),
    };
  } catch {
    return { address: null, region: null };
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
 const mapRef = useRef<import("leaflet").Map | null>(null);
 const markerRef = useRef<import("leaflet").Marker | null>(null);
 
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
    const resolved = await reverseGeocode(lat, lng);
    if (resolved.address || resolved.region) {
      onAddressResolveRef.current?.(resolved.address ?? "", resolved.region);
    }
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
 
 const handleLocateMe = async () => {
  if (!window.isSecureContext) {
    alert("دریافت موقعیت مکانی فقط روی اتصال امن HTTPS امکان‌پذیر است.");
    return;
  }

  if (!navigator.geolocation) {
    alert("مرورگر یا دستگاه شما از موقعیت مکانی پشتیبانی نمی‌کند.");
    return;
  }

  const requestPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  setLocating(true);

  try {
    let currentPosition: GeolocationPosition;

    try {
      // ابتدا برای دریافت موقعیت دقیق تلاش می‌کنیم.
      currentPosition = await requestPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      });
    } catch (error) {
      const locationError = error as GeolocationPositionError;

      // اگر مجوز رد شده باشد، تلاش دوباره فایده‌ای ندارد.
      if (locationError.code === 1) {
        throw locationError;
      }

      // اگر GPS دقیق در دسترس نبود یا Timeout شد،
      // با دقت معمولی و موقعیت ذخیره‌شده دوباره تلاش می‌کنیم.
      currentPosition = await requestPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 300000,
      });
    }

    await updatePositionRef.current(
      currentPosition.coords.latitude,
      currentPosition.coords.longitude,
    );
  } catch (error) {
    const locationError = error as GeolocationPositionError;

    console.warn("Geolocation error:", {
      code: locationError.code,
      message: locationError.message,
    });

    switch (locationError.code) {
      case 1:
        alert(
          "دسترسی به موقعیت مکانی مسدود شده است. از بخش اطلاعات برنامه یا تنظیمات سایت، مجوز Location را روی Allow قرار دهید. همچنین می‌توانید موقعیت را دستی روی نقشه انتخاب کنید.",
        );
        break;

      case 2:
        alert(
          "موقعیت مکانی دستگاه در دسترس نیست. GPS و اینترنت را روشن کنید یا موقعیت را دستی روی نقشه انتخاب کنید.",
        );
        break;

      case 3:
        alert(
          "دریافت موقعیت بیش از حد طول کشید. به فضای بازتری بروید و دوباره امتحان کنید یا نقطه را دستی روی نقشه انتخاب کنید.",
        );
        break;

      default:
        alert(
          "دریافت موقعیت مکانی انجام نشد. می‌توانید محل رخداد را دستی روی نقشه انتخاب کنید.",
        );
    }
  } finally {
    setLocating(false);
  }
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
    onAddressResolveRef.current?.(result.label, null);
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