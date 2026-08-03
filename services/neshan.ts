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

export async function neshanSearch(term: string, lat?: number, lng?: number): Promise<NeshanSearchResponse> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({ term });
  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  try {
    const res = await fetch(`${NESHAN_BASE}/v1/search?${params.toString()}`, {
      headers: { "Api-Key": apiKey },
    });
    if (!res.ok) throw new Error(`Neshan search failed: ${res.status}`);
    return (await res.json()) as NeshanSearchResponse;
  } catch {
    // Fallback mock results for offline development
    return mockSearch(term);
  }
}

export interface NeshanReverseResponse {
  formatted_address?: string;
  route_name?: string;
  route_type?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  district?: string;
}

export async function neshanReverseGeocode(lat: number, lng: number): Promise<NeshanReverseResponse> {
  const apiKey = getApiKey();
  try {
    const res = await fetch(`${NESHAN_BASE}/v5/reverse?lat=${lat}&lng=${lng}`, {
      headers: { "Api-Key": apiKey },
    });
    if (!res.ok) throw new Error(`Neshan reverse failed: ${res.status}`);
    return (await res.json()) as NeshanReverseResponse;
  } catch {
    return mockReverse(lat, lng);
  }
}

export function getNeshanMapUrl(lat: number, lng: number, zoom = 13): string {
  const apiKey = getApiKey();
  return `${NESHAN_BASE}/static/v1/maps?center=${lat},${lng}&zoom=${zoom}&width=600&height=400&api-key=${apiKey}`;
}

// ---- Mock fallbacks (used when API key is placeholder or network unavailable) ----

function mockSearch(term: string): NeshanSearchResponse {
  const items: NeshanSearchItem[] = [
    {
      title: `${term} - میدان آزادی`,
      location: { x: 35.7248, y: 51.3235 },
      neighbourhood: "آزادی",
      address: "تهران، میدان آزادی",
    },
    {
      title: `${term} - میدان ولیعصر`,
      location: { x: 35.7117, y: 51.4082 },
      neighbourhood: "ولیعصر",
      address: "تهران، میدان ولیعصر",
    },
    {
      title: `${term} - میدان انقلاب`,
      location: { x: 35.7009, y: 51.3915 },
      neighbourhood: "انقلاب",
      address: "تهران، میدان انقلاب",
    },
    {
      title: `${term} - میدان تجریش`,
      location: { x: 35.8042, y: 51.4344 },
      neighbourhood: "تجریش",
      address: "تهران، میدان تجریش",
    },
    {
      title: `${term} - میدان امام حسین`,
      location: { x: 35.7011, y: 51.4381 },
      neighbourhood: "امام حسین",
      address: "تهران، میدان امام حسین",
    },
  ];
  return { count: items.length, items };
}

function mockReverse(lat: number, lng: number): NeshanReverseResponse {
  const district = Math.min(22, Math.max(1, (Math.floor(((lat - 35.55) * 10) + ((lng - 51.2) * 5)) % 22) + 1));
  return {
    formatted_address: `تهران، منطقه ${toFa(district)}، نزدیک مختصات ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    neighbourhood: `محله نمونه ${toFa(district)}`,
    city: "تهران",
    state: "تهران",
    district: `منطقه ${toFa(district)}`,
  };
}

function toFa(n: number): string {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).split("").map((d) => fa[parseInt(d, 10)] ?? d).join("");
}

export const SEVERITY_COLOR_HEX: Record<Severity, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};
