import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { neshanSearch } from "@/services/neshan";
import { z } from "zod";

const Schema = z.object({
  term: z.string().min(2, "عبارت جستجو حداقل ۲ کاراکتر"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function GET(req: Request) {
  try {
    requireAuth();
    const { searchParams } = new URL(req.url);
    const term = searchParams.get("term") ?? "";
    const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
    const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;

    const parsed = Schema.safeParse({ term, lat, lng });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" }, { status: 400 });
    }

    const result = await neshanSearch(parsed.data.term, parsed.data.lat, parsed.data.lng);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
