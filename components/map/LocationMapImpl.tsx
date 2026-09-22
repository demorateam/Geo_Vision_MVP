"use client";

import { useEffect, useRef, useState } from "react";
import L from "@neshan-maps-platform/leaflet";
import "@neshan-maps-platform/leaflet/dist/leaflet.css";
import { Search, Locate, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationMapMarker {
  id: string;
  position: LatLng;
  label?: string;
  color?: string;
}

export interface LocationMapProps {
  center: LatLng;
  selectable?: boolean;
  showSearch?: boolean;
  height?: string;
  additionalMarkers?: LocationMapMarker[];
  fitAllMarkers?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  onAddressResolve?: (address: string, region: string | null) => void;
}

interface ReverseGeocodeResult {
  address: string | null;
  region: string | null;
}

const NESHAN_MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY || "";

function createMarkerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:${color};border:4px solid white;box-shadow:0 3px 12px rgba(15,23,42,.45)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
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

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    if (!res.ok) return { address: null, region: null };
    const data = await res.json();
    return {
      address: data?.formatted_address ?? data?.address ?? null,
      region: normalizeMunicipalityZone(data?.municipality_zone),
    };
  } catch {
    return { address: null, region: null };
  }
}

async function searchAddress(
  query: string,
): Promise<{ lat: number; lng: number; label: string }[]> {
  try {
    const res = await fetch(
      `/api/search-location?term=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map(
      (item: {
        title?: string;
        address?: string;
        location: { x: number; y: number };
      }) => ({
        lat: item.location.y,
        lng: item.location.x,
        label: item.address || item.title || "نتیجه جستجو",
      }),
    );
  } catch {
    return [];
  }
}

export function LocationMap({
  center,
  selectable = false,
  showSearch = false,
  height = "400px",
  additionalMarkers = [],
  fitAllMarkers = false,
  onLocationSelect,
  onAddressResolve,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const additionalMarkerRefs = useRef(
    new Map<string, import("leaflet").Marker>(),
  );

  const [position, setPosition] = useState<LatLng>(center);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { lat: number; lng: number; label: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [mapError, setMapError] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLocationSelectRef = useRef(onLocationSelect);
  const onAddressResolveRef = useRef(onAddressResolve);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    onAddressResolveRef.current = onAddressResolve;
  }, [onLocationSelect, onAddressResolve]);

  const updatePositionRef = useRef<(lat: number, lng: number) => void>(
    () => {},
  );
  updatePositionRef.current = async (lat: number, lng: number) => {
    setPosition({ lat, lng });
    onLocationSelectRef.current?.(lat, lng);
    const resolved = await reverseGeocode(lat, lng);
    if (resolved.address || resolved.region) {
      onAddressResolveRef.current?.(resolved.address ?? "", resolved.region);
    }
  };

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
      icon: createMarkerIcon("#dc2626"),
      draggable: selectable,
    }).addTo(map);
    marker.bindTooltip(selectable ? "موقعیت انتخاب‌شده" : "محل رخداد", {
      direction: "top",
      offset: [0, -10],
    });
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      updatePositionRef.current(lat, lng);
    });
    markerRef.current = marker;

    if (selectable) {
      map.on("click", (event: L.LeafletMouseEvent) => {
        updatePositionRef.current(event.latlng.lat, event.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      additionalMarkerRefs.current.clear();
    };
    // Map creation must only happen once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([position.lat, position.lng]);

    if (!fitAllMarkers || additionalMarkers.length === 0) {
      mapRef.current.flyTo(
        [position.lat, position.lng],
        Math.max(mapRef.current.getZoom(), 16),
      );
    }
  }, [position.lat, position.lng, fitAllMarkers, additionalMarkers.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set(additionalMarkers.map((marker) => marker.id));
    additionalMarkerRefs.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.removeFrom(map);
        additionalMarkerRefs.current.delete(id);
      }
    });

    for (const item of additionalMarkers) {
      let marker = additionalMarkerRefs.current.get(item.id);
      if (!marker) {
        marker = L.marker([item.position.lat, item.position.lng], {
          icon: createMarkerIcon(item.color ?? "#2563eb"),
        }).addTo(map);
        if (item.label) {
          marker.bindTooltip(item.label, {
            direction: "top",
            offset: [0, -10],
          });
        }
        additionalMarkerRefs.current.set(item.id, marker);
      } else {
        marker.setLatLng([item.position.lat, item.position.lng]);
        marker.setIcon(createMarkerIcon(item.color ?? "#2563eb"));
        if (item.label) marker.setTooltipContent(item.label);
      }
    }

    if (fitAllMarkers && additionalMarkers.length > 0) {
      const points: [number, number][] = [
        [position.lat, position.lng],
        ...additionalMarkers.map(
          (marker) =>
            [marker.position.lat, marker.position.lng] as [number, number],
        ),
      ];
      map.fitBounds(L.latLngBounds(points), {
        padding: [42, 42],
        maxZoom: 16,
        animate: true,
      });
    }
  }, [additionalMarkers, fitAllMarkers, position.lat, position.lng]);

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
        currentPosition = await requestPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 60000,
        });
      } catch (error) {
        const locationError = error as GeolocationPositionError;
        if (locationError.code === 1) throw locationError;
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
      switch (locationError.code) {
        case 1:
          alert(
            "دسترسی موقعیت مکانی مسدود شده است. مجوز Location را فعال کنید یا نقطه را دستی انتخاب کنید.",
          );
          break;
        case 2:
          alert("موقعیت دستگاه در دسترس نیست. GPS و اینترنت را بررسی کنید.");
          break;
        case 3:
          alert(
            "دریافت موقعیت بیش از حد طول کشید. دوباره تلاش کنید یا نقطه را دستی انتخاب کنید.",
          );
          break;
        default:
          alert(
            "دریافت موقعیت مکانی انجام نشد. محل رخداد را دستی انتخاب کنید.",
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

  const handleSelectResult = (result: {
    lat: number;
    lng: number;
    label: string;
  }) => {
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
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pr-9"
            />
            {searching && (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full rounded-lg border bg-white shadow-lg">
              {searchResults.map((result) => (
                <button
                  key={`${result.lat}-${result.lng}-${result.label}`}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="block w-full truncate border-b p-2 text-right text-sm last:border-b-0 hover:bg-slate-50"
                >
                  {result.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ height }}
      >
        {mapError ? (
          <div className="flex h-full items-center justify-center bg-slate-50 p-4 text-center text-sm text-muted-foreground">
            کلید نقشه نشان تنظیم نشده است (NEXT_PUBLIC_NESHAN_MAP_KEY)
          </div>
        ) : (
          <div
            ref={mapContainerRef}
            style={{ height: "100%", width: "100%" }}
          />
        )}

        {selectable && !mapError && (
          <Button
            type="button"
            size="sm"
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute right-3 top-3 z-[1000] gap-2 shadow-lg"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Locate className="h-4 w-4" />
            )}
            موقعیت من
          </Button>
        )}
      </div>
    </div>
  );
}
