/**
 * GeoVision AI Assistant — API Endpoint (فقط سرور)
 *
 * POST /api/admin/ai-assistant
 * Body:  { messages: [{ role: "user" | "assistant", content: string }, ...] }
 *        (تاریخچه مکالمه سمت فرانت نگه‌داری و با هر درخواست ارسال می‌شود)
 *
 * Response: { kind: "ANSWER", answer, sql, rowCount }
 *         | { kind: "CLARIFICATION", question }
 *         | { kind: "CANNOT_ANSWER", reason }
 *         | { error: string }  (400/401/403/429/500/502)
 *
 * دسترسی: نقش‌های مجاز از env خوانده می‌شود (AI_ASSISTANT_ROLES، پیش‌فرض ADMIN)
 * و از سیستم Auth فعلی پروژه (lib/auth.ts) استفاده می‌کند — بدون سیستم Auth جدید.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import type { SessionUser } from "@/types";
import {
  runAssistant,
  sanitizeHistory,
  AssistantError,
} from "@/lib/ai-assistant/assistant-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = (process.env.AI_ASSISTANT_ROLES ?? "ADMIN")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean) as SessionUser["role"][];

/** Rate Limit ساده درون‌حافظه‌ای (در هر نمونه سرور) */
const RATE_LIMIT = Number(process.env.AI_ASSISTANT_RATE_LIMIT ?? "20"); // حداکثر درخواست در پنجره؛ 0 = غیرفعال
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  if (RATE_LIMIT <= 0) return false;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 1000) {
    Array.from(hits.entries()).forEach(([k, v]) => {
      if (v.every((t: number) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    });
  }
  return false;
}

export async function POST(req: Request) {
  // ---------- احراز هویت و نقش (سیستم فعلی پروژه) ----------
  let session: SessionUser;
  try {
    session = await requireRole(...ALLOWED_ROLES);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "شما به دستیار هوشمند دسترسی ندارید." }, { status: 403 });
    }
    return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
  }

  if (isRateLimited(session?.id ?? "anon")) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها زیاد است؛ لطفاً چند دقیقه بعد دوباره تلاش کنید." },
      { status: 429 },
    );
  }

  // ---------- اعتبارسنجی ورودی ----------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست معتبر نیست." }, { status: 400 });
  }
  const messages = (body as { messages?: unknown } | null)?.messages;
  let history;
  try {
    history = sanitizeHistory(messages);
  } catch (err) {
    if (err instanceof AssistantError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  // ---------- اجرای دستیار ----------
  try {
    const result = await runAssistant(history);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AssistantError) {
      const status = err.code === "BAD_REQUEST" ? 400 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    if (err instanceof Error && err.name === "LlmError") {
      const message = err.message.includes("OPENAI_API_KEY")
        ? "کلید سرویس هوش مصنوعی روی سرور تنظیم نشده است."
        : "ارتباط با سرویس هوش مصنوعی برقرار نشد؛ لطفاً بعداً تلاش کنید.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    console.error("[ai-assistant] unexpected error:", err);
    return NextResponse.json({ error: "خطای غیرمنتظره در سرور رخ داد." }, { status: 500 });
  }
}
