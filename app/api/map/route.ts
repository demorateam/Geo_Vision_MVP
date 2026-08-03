import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getNeshanMapUrl } from "@/services/neshan";
import { z } from "zod";

const Schema = z.object({
  lat: z.number(),
  lng: z.number(),
  zoom: z.number().min(1).max(20).optional(),
});

export async function GET(req: Request) {
  try {
    requireAuth();
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const zoom = searchParams.get("zoom") ? Number(searchParams.get("zoom")) : 13;
    const parsed = Schema.safeParse({ lat, lng, zoom });
    if (!parsed.success) {
      return NextResponse.json({ error: "مختصات نامعتبر" }, { status: 400 });
    }
    const url = getNeshanMapUrl(parsed.data.lat, parsed.data.lng, parsed.data.zoom);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
