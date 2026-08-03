import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { neshanReverseGeocode } from "@/services/neshan";
import { z } from "zod";

const Schema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function GET(req: Request) {
  try {
    requireAuth();
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const parsed = Schema.safeParse({ lat, lng });
    if (!parsed.success) {
      return NextResponse.json({ error: "مختصات نامعتبر" }, { status: 400 });
    }
    const result = await neshanReverseGeocode(parsed.data.lat, parsed.data.lng);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
