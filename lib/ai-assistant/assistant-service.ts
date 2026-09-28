/**
 * GeoVision AI Assistant — سرویس ارکستراسیون (فقط سرور)
 *
 * جریان: History → Planner(LLM) → SQL Safety Layer → اجرای Read-Only روی SQLite
 *        → Narrator(LLM) → پاسخ فارسی
 *
 * طراحی شده برای ارتقای آینده (V2: جایگزینی اجرای SQL با Data Tools، V3: Agent)
 * — سرویس از UI و از کلاینت LLM و از اجرای دیتابیس جدا است.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { chatCompletion, extractJsonObject, LlmError } from "./llm-client";
import { buildPlannerSystemPrompt, buildNarratorSystemPrompt } from "./prompts";
import { buildDateContext } from "./jalali";
import { validateAndNormalizeSql, MAX_ROWS, MAX_LLM_ROWS, type SqlParameter } from "./sql-safety";

// ---------------------------------------------------------------------------
// انواع و Schemaهای خروجی LLM
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const plannerOutputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("QUERY"),
    sql: z.string().min(1).max(2000),
    params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).max(30).optional(),
  }),
  z.object({
    type: z.literal("CLARIFICATION"),
    question: z.string().min(3).max(1000),
  }),
  z.object({
    type: z.literal("CANNOT_ANSWER"),
    reason: z.string().min(3).max(1000),
  }),
]);

type PlannerOutput = z.infer<typeof plannerOutputSchema>;

const narratorOutputSchema = z.object({ answer: z.string().min(1).max(6000) });

export type AssistantResponse =
  | { kind: "ANSWER"; answer: string; sql: string | null; rowCount: number }
  | { kind: "CLARIFICATION"; question: string }
  | { kind: "CANNOT_ANSWER"; reason: string };

export class AssistantError extends Error {
  constructor(
    public code: "BAD_REQUEST" | "LLM_BAD_OUTPUT" | "SQL_REJECTED",
    message: string,
  ) {
    super(message);
    this.name = "AssistantError";
  }
}

// ---------------------------------------------------------------------------
// محدودیت‌ها
// ---------------------------------------------------------------------------

const MAX_HISTORY_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;
const PLANNER_TIMEOUT_MS = 30_000;
const NARRATOR_TIMEOUT_MS = 20_000;
const MAX_CELL_LENGTH = 300;

// ---------------------------------------------------------------------------
// ورودی
// ---------------------------------------------------------------------------

export function sanitizeHistory(input: unknown): ConversationMessage[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AssistantError("BAD_REQUEST", "تاریخچه مکالمه ارسال نشده است.");
  }
  const cleaned: ConversationMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim();
    if (!text) continue;
    cleaned.push({ role, content: text.slice(0, MAX_CONTENT_LENGTH) });
  }
  if (cleaned.length === 0) {
    throw new AssistantError("BAD_REQUEST", "پیام معتبری برای ارسال یافت نشد.");
  }
  const last = cleaned[cleaned.length - 1];
  if (last.role !== "user") {
    throw new AssistantError("BAD_REQUEST", "آخرین پیام مکالمه باید سؤال کاربر باشد.");
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES);
}

// ---------------------------------------------------------------------------
// پاک‌سازی ردیف‌ها قبل از ارسال به LLM
// ---------------------------------------------------------------------------

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (value instanceof Date) {
      out[key] = value.toISOString(); // خوانا برای LLM — تبدیل مجدد به ms ممنوع در پرامپت
    } else if (typeof value === "bigint") {
      out[key] = Number(value);
    } else if (typeof value === "number" && !Number.isFinite(value)) {
      out[key] = null;
    } else if (typeof value === "string") {
      out[key] = value.length > MAX_CELL_LENGTH ? `${value.slice(0, MAX_CELL_LENGTH)}…` : value;
    } else if (typeof value === "object") {
      out[key] = String(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// فراخوانی Planner با یک تلاش اصلاح خودکار
// ---------------------------------------------------------------------------

async function callPlanner(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<PlannerOutput> {
  let parseError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const requestMessages = [...messages];
    if (parseError) {
      requestMessages.push({
        role: "user",
        content: `JSON قبلی نامعتبر بود (${parseError}). فقط یک آبجکت JSON معتبر مطابق قالب مقرّر برگردان.`,
      });
    }
    const content = await chatCompletion(requestMessages, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 1200,
      timeoutMs: PLANNER_TIMEOUT_MS,
    });
    const json = extractJsonObject(content);
    if (!json) {
      parseError = "پاسخ JSON نبود";
      continue;
    }
    const parsed = plannerOutputSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    parseError = "ساختار JSON مطابق قالب نبود";
  }
  throw new AssistantError("LLM_BAD_OUTPUT", "پاسخ ساختاریافته از دستیار دریافت نشد.");
}

// ---------------------------------------------------------------------------
// اجرای اصلی
// ---------------------------------------------------------------------------

export async function runAssistant(history: ConversationMessage[]): Promise<AssistantResponse> {
  const dctx = buildDateContext();
  const plannerSystem = buildPlannerSystemPrompt(dctx);
  const baseMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: plannerSystem },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  // ---------- مرحله ۱: Planner ----------
  let planner = await callPlanner(baseMessages);

  if (planner.type === "CLARIFICATION") {
    return { kind: "CLARIFICATION", question: planner.question.trim().slice(0, 1000) };
  }
  if (planner.type === "CANNOT_ANSWER") {
    return { kind: "CANNOT_ANSWER", reason: planner.reason.trim().slice(0, 1000) };
  }

  // ---------- مرحله ۲: اعتبارسنجی امنیتی (+ یک تلاش اصلاح) ----------
  let params: SqlParameter[] = (planner.params ?? []).map((p) =>
    typeof p === "boolean" ? (p ? 1 : 0) : p,
  );
  let validation = validateAndNormalizeSql(planner.sql, params);
  if (!validation.ok) {
    console.warn("[ai-assistant] SQL rejected by safety layer:", validation.reason);
    const repairMessages = [
      ...baseMessages,
      {
        role: "user" as const,
        content: JSON.stringify({
          validatorError: validation.reason,
          rejectedSql: planner.sql.slice(0, 1000),
          instruction:
            "کوئری بالا توسط لایه امنیتی رد شد. طبق قواعد، فقط یک آبجکت JSON جدید و اصلاح‌شده برگردان.",
        }),
      },
    ];
    planner = await callPlanner(repairMessages);
    if (planner.type === "CLARIFICATION") {
      return { kind: "CLARIFICATION", question: planner.question.trim().slice(0, 1000) };
    }
    if (planner.type === "CANNOT_ANSWER") {
      return { kind: "CANNOT_ANSWER", reason: planner.reason.trim().slice(0, 1000) };
    }
    params = (planner.params ?? []).map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
    validation = validateAndNormalizeSql(planner.sql, params);
    if (!validation.ok) {
      console.warn("[ai-assistant] SQL rejected again:", validation.reason);
      return {
        kind: "CANNOT_ANSWER",
        reason:
          "متأسفانه نتوانستم کوئری امن و معتبری برای این سؤال تولید کنم. لطفاً سؤال را ساده‌تر یا دقیق‌تر مطرح کنید.",
      };
    }
  }

  // ---------- مرحله ۳: اجرای فقط‌خواندنی ----------
  let rawRows: Record<string, unknown>[];
  try {
    const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(validation.sql, ...params);
    rawRows = Array.isArray(result) ? result : [];
  } catch (err) {
    console.error("[ai-assistant] SQL execution failed:", err);
    return {
      kind: "CANNOT_ANSWER",
      reason: "اجرای پرس‌وجو روی دیتابیس با خطا مواجه شد. لطفاً سؤال را کمی متفاوت مطرح کنید.",
    };
  }

  const totalRowCount = rawRows.length;
  const rows = rawRows.slice(0, MAX_ROWS).map(sanitizeRow);
  const llmRows = rows.slice(0, MAX_LLM_ROWS);
  const truncated = totalRowCount > llmRows.length;

  // ---------- مرحله ۴: Narrator ----------
  const question = history[history.length - 1].content;
  const payload = {
    question: question.slice(0, 1000),
    sql: validation.sql,
    rowCount: totalRowCount,
    truncated,
    rows: llmRows,
  };

  try {
    const narration = await chatCompletion(
      [
        { role: "system", content: buildNarratorSystemPrompt() },
        { role: "user", content: JSON.stringify(payload) },
      ],
      {
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 1000,
        timeoutMs: NARRATOR_TIMEOUT_MS,
      },
    );
    const parsed = narratorOutputSchema.safeParse(extractJsonObject(narration));
    if (parsed.success) {
      return {
        kind: "ANSWER",
        answer: parsed.data.answer.trim().slice(0, 4000),
        sql: validation.sql,
        rowCount: totalRowCount,
      };
    }
    console.warn("[ai-assistant] narrator output invalid, using fallback");
  } catch (err) {
    if (err instanceof LlmError) throw err; // خطاهای واقعی LLM باید سطح بالا دیده شوند
    console.warn("[ai-assistant] narration failed, using fallback:", err);
  }

  // پاسخ جایگزین قطعی (بدون توهم)
  const fallback =
    totalRowCount === 0
      ? "هیچ داده‌ای مطابق این سؤال در دیتابیس ثبت نشده است."
      : `نتیجه پرس‌وجو ${totalRowCount} ردیف بود. نمونه داده‌ها: ${JSON.stringify(llmRows.slice(0, 10))}`;
  return { kind: "ANSWER", answer: fallback, sql: validation.sql, rowCount: totalRowCount };
}
