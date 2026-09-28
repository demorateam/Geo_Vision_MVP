/**
 * GeoVision AI Assistant — کلاینت LLM سبک و Provider-agnostic
 *
 * با هر سرویس «سازگار با OpenAI» کار می‌کند (AvalAI، OpenAI، Arvan، ...)
 * تنظیمات فقط از Environment Variable خوانده می‌شود:
 *   OPENAI_API_KEY     (الزامی)
 *   OPENAI_BASE_URL    (پیش‌فرض: https://api.avalai.ir/v1)
 *   LLM_MODEL          (مدل اصلی پروژه، مثل gpt-4o-mini)
 *   AI_ASSISTANT_MODEL (اختیاری — مدل مخصوص دستیار؛ اگر نبود از LLM_MODEL استفاده می‌شود)
 *
 * هیچ SDK اضافه‌ای لازم نیست — fetch خالص با timeout.
 * ⚠️ این فایل فقط در سرور (API Route) import شود — هرگز در کلاینت.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** فعال‌سازی JSON mode سرویس‌سازگار با OpenAI (در صورت عدم پشتیبانی، خودکار غیرفعال و تکرار می‌شود) */
  jsonMode?: boolean;
  timeoutMs?: number;
}

export class LlmError extends Error {
  constructor(
    public code:
      | "LLM_API_KEY_MISSING"
      | "LLM_HTTP_ERROR"
      | "LLM_TIMEOUT"
      | "LLM_EMPTY_RESPONSE"
      | "LLM_BAD_RESPONSE"
      | "LLM_NETWORK",
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

function getConfig(): { apiKey: string; baseUrl: string; model: string } {
  // جداسازی کامل پروایدر دستیار: اول متغیرهای مخصوص دستیار، بعد متغیرهای عمومی پروژه
  const apiKey = process.env.AI_ASSISTANT_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LlmError("LLM_API_KEY_MISSING", "OPENAI_API_KEY روی سرور تنظیم نشده است.");
  }
  const baseUrl = (
    process.env.AI_ASSISTANT_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.avalai.ir/v1"
  ).replace(/\/+$/, "");
  const model = process.env.AI_ASSISTANT_MODEL || process.env.LLM_MODEL || "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();
  const timeoutMs = opts.timeoutMs ?? 30_000;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.1,
    max_tokens: opts.maxTokens ?? 1200,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const doFetch = () =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

  let res: Response;
  try {
    res = await doFetch();
    // برخی Providerها response_format را پشتیبانی نمی‌کنند → یک‌بار بدون آن تکرار کن
    if (!res.ok && opts.jsonMode && res.status === 400) {
      delete body.response_format;
      res = await doFetch();
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new LlmError("LLM_TIMEOUT", `پاسخ‌گیری از LLM بیش از ${Math.round(timeoutMs / 1000)} ثانیه طول کشید.`);
    }
    throw new LlmError("LLM_NETWORK", `خطای شبکه در اتصال به سرویس LLM: ${err instanceof Error ? err.message : "unknown"}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LlmError("LLM_HTTP_ERROR", `سرویس LLM خطای ${res.status} برگرداند: ${text.slice(0, 300)}`);
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new LlmError("LLM_BAD_RESPONSE", "پاسخ سرویس LLM قابل تجزیه نبود.");
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new LlmError("LLM_EMPTY_RESPONSE", "سرویس LLM پاسخ خالی برگرداند.");
  }
  return content;
}

/**
 * استخراج اولین آبجکت JSON از متن پاسخ LLM
 * (تحمل fence ```json و متن اضافه اطراف JSON)
 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1]?.trim() || trimmed;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
