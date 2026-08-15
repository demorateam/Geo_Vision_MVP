import type { Severity } from "@/types";

const NESHAN_BASE = "https://api.neshan.org";

function getApiKey(): string {
  return process.env.NESHAN_API_KEY || "";
}

export interface NeshanSearchItem {
  title: string;
  location: { x: number; y: number };
  neighbourhood?: string;
  address?: string;
}

export interface NeshanSearchResponse {
  count: number;
  items: NeshanSearchItem[];
}

export async function neshanSearch(
  term: string,
  lat?: number,
  lng?: number,
): Promise<NeshanSearchResponse> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith("your_")) return mockSearch(term);

  const params = new URLSearchParams({ term });
  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  try {
    const res = await fetch(`${NESHAN_BASE}/v1/search?${params.toString()}`, {
      headers: { "Api-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Neshan search failed: ${res.status}`);
    return (await res.json()) as NeshanSearchResponse;
  } catch {
    return mockSearch(term);
  }
}

export interface NeshanReverseResponse {
  status?: string;
  formatted_address?: string;
  route_name?: string;
  route_type?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  municipality_zone?: string | number | null;
  district?: string;
}

export async function neshanReverseGeocode(
  lat: number,
  lng: number,
): Promise<NeshanReverseResponse> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith("your_")) return mockReverse(lat, lng);

  try {
    const res = await fetch(`${NESHAN_BASE}/v5/reverse?lat=${lat}&lng=${lng}`, {
      headers: { "Api-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Neshan reverse failed: ${res.status}`);
    return (await res.json()) as NeshanReverseResponse;
  } catch {
    // Never fabricate a municipality zone. A made-up region would be stored as
    // real operational data. Address-only mock data is sufficient for offline UI.
    return mockReverse(lat, lng);
  }
}

export function getNeshanMapUrl(lat: number, lng: number, zoom = 13): string {
  const apiKey = getApiKey();
  return `${NESHAN_BASE}/static/v1/maps?center=${lat},${lng}&zoom=${zoom}&width=600&height=400&api-key=${apiKey}`;
}

// Address-only fallbacks used for offline development. They intentionally do
// not include municipality_zone because region guessing is unsafe.
function mockSearch(term: string): NeshanSearchResponse {
  const items: NeshanSearchItem[] = [
    {
      title: `${term} - میدان آزادی`,
      location: { x: 51.3235, y: 35.7248 },
      neighbourhood: "آزادی",
      address: "تهران، میدان آزادی",
    },
    {
      title: `${term} - میدان ولیعصر`,
      location: { x: 51.4082, y: 35.7117 },
      neighbourhood: "ولیعصر",
      address: "تهران، میدان ولیعصر",
    },
    {
      title: `${term} - میدان انقلاب`,
      location: { x: 51.3915, y: 35.7009 },
      neighbourhood: "انقلاب",
      address: "تهران، میدان انقلاب",
    },
    {
      title: `${term} - میدان تجریش`,
      location: { x: 51.4344, y: 35.8042 },
      neighbourhood: "تجریش",
      address: "تهران، میدان تجریش",
    },
    {
      title: `${term} - میدان امام حسین`,
      location: { x: 51.4381, y: 35.7011 },
      neighbourhood: "امام حسین",
      address: "تهران، میدان امام حسین",
    },
  ];
  return { count: items.length, items };
}

function mockReverse(lat: number, lng: number): NeshanReverseResponse {
  return {
    formatted_address: `نزدیک مختصات ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    city: "تهران",
    state: "تهران",
    municipality_zone: null,
  };
}

export const SEVERITY_COLOR_HEX: Record<Severity, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};