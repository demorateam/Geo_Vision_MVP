import { NextResponse } from "next/server";
import { analyzeIncident } from "@/services/ai-analyzer";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  imageBase64: z.string().max(18_000_000, "حجم تصویر برای تحلیل بیش از حد مجاز است").nullable().optional(),
  description: z.string().min(3, "توضیحات حداقل ۳ کاراکتر").max(2000, "توضیحات بیش از حد طولانی است"),
});

export async function POST(req: Request) {
  try {
    await requireRole("CITIZEN");
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" }, { status: 400 });
    }
    const { imageBase64, description } = parsed.data;
    const { result, source } = await analyzeIncident(imageBase64 ?? null, description);
    return NextResponse.json({ analysis: result, source });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور در تحلیل رخداد" }, { status: 500 });
  }
}
