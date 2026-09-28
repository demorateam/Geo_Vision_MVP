export interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  colorCode: string;
  incidentType: string;
  status: string;
  region: string;
}

export interface ClusterBucket {
  key: string;
  lat: number;
  lng: number;
  count: number;
  points: ClusterPoint[];
  colorCounts: Record<string, number>;
  dominantColor: string;
}

const COLOR_PRIORITY = ["Red", "Orange", "Yellow", "Green"];

function pickDominantColor(colorCounts: Record<string, number>): string {
  let best = "Green";
  let bestCount = -1;
  for (const color of COLOR_PRIORITY) {
    const c = colorCounts[color] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = color;
    }
  }
  return best;
}

/**
 * خوشه‌بندی دستی با Grid پیکسلی — بدون هیچ افزونه‌ی خارجی Leaflet،
 * فقط با استفاده از latLngToContainerPoint خودِ instance نشان (سازگار کامل با SDK).
 * باید بعد از هر moveend/zoomend دوباره صدا زده شود، چون گروه‌بندی به موقعیت
 * پیکسلی فعلی نقاط روی صفحه وابسته است (نه به مختصات جغرافیایی ثابت).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeClusters(map: any, points: ClusterPoint[], cellPixelSize = 64): ClusterBucket[] {
  const buckets = new Map<string, ClusterBucket>();

  for (const p of points) {
    const containerPoint = map.latLngToContainerPoint([p.latitude, p.longitude]);
    const cx = Math.floor(containerPoint.x / cellPixelSize);
    const cy = Math.floor(containerPoint.y / cellPixelSize);
    const key = `${cx}_${cy}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, lat: 0, lng: 0, count: 0, points: [], colorCounts: {}, dominantColor: "Green" };
      buckets.set(key, bucket);
    }
    bucket.points.push(p);
    bucket.count += 1;
    bucket.colorCounts[p.colorCode] = (bucket.colorCounts[p.colorCode] ?? 0) + 1;
  }

  const result: ClusterBucket[] = [];
  buckets.forEach((bucket) => {
    const latSum = bucket.points.reduce((s, p) => s + p.latitude, 0);
    const lngSum = bucket.points.reduce((s, p) => s + p.longitude, 0);
    bucket.lat = latSum / bucket.points.length;
    bucket.lng = lngSum / bucket.points.length;
    bucket.dominantColor = pickDominantColor(bucket.colorCounts);
    result.push(bucket);
  });

  return result;
}

/** پرتکرارترین مقدار در یک آرایه‌ی رشته‌ای (برای «رایج‌ترین نوع رخداد» / «وضعیت غالب» یک خوشه) */
export function mostFrequent(values: string[]): string {
  const counts: Record<string, number> = {};
  let best = values[0] ?? "-";
  let bestCount = 0;
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
    if (counts[v] > bestCount) {
      bestCount = counts[v];
      best = v;
    }
  }
  return best;
}
