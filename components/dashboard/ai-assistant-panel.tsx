"use client";

/**
 * GeoVision AI Assistant — پنل مکالمه (Client Component)
 *
 * - تاریخچه مکالمه سمت فرانت نگه‌داری می‌شود (state + sessionStorage) و همراه
 *   هر درخواست به /api/admin/ai-assistant ارسال می‌شود (مکالمه چندمرحله‌ای).
 * - RTL و هماهنگ با توکن‌های Tailwind/shadcn پروژه؛ بدون رنگ hardcoded.
 * - حالت‌های loading / خطا / CLARIFICATION / CANNOT_ANSWER پوشش داده شده است.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Database,
  Eraser,
  HelpCircle,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type MessageKind = "ANSWER" | "CLARIFICATION" | "CANNOT_ANSWER" | "ERROR";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  kind?: MessageKind;
  content: string;
  sql?: string | null;
  rowCount?: number;
  at?: number;
}

const STORAGE_KEY = "geovision-ai-assistant-history";
const MAX_HISTORY = 20;

const SUGGESTED_QUESTIONS = [
  "بیشترین رخدادها در کدام مناطق بوده؟",
  "این ماه چند رخداد ثبت شده؟",
  "بیشترین نوع رخداد چه بوده؟",
  "چند رخداد بحرانی داریم؟",
  "عملکرد اپراتور علی رضایی چطور بوده؟",
  "کدام اپراتورها بیشترین رخداد را بسته‌اند؟",
];

interface ApiOk {
  kind: "ANSWER" | "CLARIFICATION" | "CANNOT_ANSWER";
  answer?: string;
  question?: string;
  reason?: string;
  sql?: string | null;
  rowCount?: number;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m === "object" &&
          ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
          typeof (m as ChatMessage).content === "string",
      )
      .slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

export function AiAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMessages(loadHistory());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {
      /* storage پر است یا در دسترس نیست — بی‌اهمیت */
    }
  }, [messages, hydrated]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (preset?: string) => {
      const text = (preset ?? input).trim();
      if (!text || loading) return;

      const userMsg: ChatMessage = { id: makeId(), role: "user", content: text, at: Date.now() };
      const outgoing = [...messages, userMsg].slice(-MAX_HISTORY);
      setMessages(outgoing);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/admin/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: outgoing.map(({ role, content }) => ({ role, content })),
          }),
        });
        const data = (await res.json().catch(() => null)) as (ApiOk & { error?: string }) | null;

        if (!res.ok || !data) {
          const msg = data?.error ?? "ارتباط با سرور برقرار نشد.";
          setMessages((prev) => [
            ...prev,
            { id: makeId(), role: "assistant", kind: "ERROR", content: msg, at: Date.now() },
          ]);
          toast.error(msg);
          return;
        }

        const assistant: ChatMessage = { id: makeId(), role: "assistant", content: "", at: Date.now() };
        if (data.kind === "ANSWER") {
          assistant.kind = "ANSWER";
          assistant.content = data.answer ?? "";
          assistant.sql = data.sql ?? null;
          assistant.rowCount = data.rowCount;
        } else if (data.kind === "CLARIFICATION") {
          assistant.kind = "CLARIFICATION";
          assistant.content = data.question ?? "سؤال تکمیلی دریافت شد.";
        } else {
          assistant.kind = "CANNOT_ANSWER";
          assistant.content = data.reason ?? "امکان پاسخ به این سؤال وجود ندارد.";
        }
        setMessages((prev) => [...prev, assistant]);
      } catch {
        const msg = "خطای شبکه؛ لطفاً اتصال خود را بررسی و دوباره تلاش کنید.";
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "assistant", kind: "ERROR", content: msg, at: Date.now() },
        ]);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages],
  );

  const clearChat = useCallback(() => {
    if (loading) return;
    setMessages([]);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, [loading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const showSuggestions = hydrated && messages.length === 0;

  return (
    <section
      dir="rtl"
      aria-label="دستیار هوشمند GeoVision"
      className="flex h-full min-h-[520px] max-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      {/* ---------- هدر ---------- */}
      <header className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold sm:text-base">دستیار هوشمند GeoVision</h2>
          <p className="truncate text-xs text-muted-foreground">
            سؤالات مدیریتی خود را درباره داده‌های رخدادها بپرسید
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          disabled={loading || messages.length === 0}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="پاک کردن مکالمه"
          title="پاک کردن مکالمه"
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* ---------- مکالمه ---------- */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-4 overflow-y-auto p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar]:w-1.5"
      >
        {showSuggestions && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">سلام! چطور می‌توانم کمک کنم؟</p>
              <p className="mt-1 text-xs text-muted-foreground">
                درباره رخدادها، مناطق، اپراتورها و سازمان‌ها بپرسید
              </p>
            </div>
            <div className="mt-2 flex max-w-md flex-wrap items-center justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  className="rounded-full border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="flex max-w-[90%] gap-2.5">
                <span
                  className={
                    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
                    (m.kind === "ERROR" || m.kind === "CANNOT_ANSWER"
                      ? "bg-destructive/10 text-destructive"
                      : m.kind === "CLARIFICATION"
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-muted text-muted-foreground")
                  }
                  aria-hidden="true"
                >
                  {m.kind === "ERROR" || m.kind === "CANNOT_ANSWER" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : m.kind === "CLARIFICATION" ? (
                    <HelpCircle className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <div
                    className={
                      "whitespace-pre-wrap break-words rounded-2xl rounded-tr-md border px-4 py-2.5 text-sm leading-6 " +
                      (m.kind === "ERROR" || m.kind === "CANNOT_ANSWER"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : m.kind === "CLARIFICATION"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "bg-muted/50")
                    }
                  >
                    {m.content}
                  </div>
                  {m.kind === "ANSWER" && m.sql && (
                    <details className="group mt-2">
                      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                        <Database className="h-3.5 w-3.5" aria-hidden="true" />
                        کوئری اجرا شده
                      </summary>
                      <pre
                        dir="ltr"
                        className="mt-2 max-h-48 overflow-auto rounded-lg border bg-muted/60 p-3 text-left font-mono text-[11px] leading-5"
                      >
                        {m.sql}
                      </pre>
                    </details>
                  )}
                  {m.kind === "ANSWER" && typeof m.rowCount === "number" && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      بر اساس {m.rowCount} ردیف داده از دیتابیس
                    </p>
                  )}
                </div>
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex justify-start" aria-label="دستیار در حال نوشتن پاسخ است">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-tr-md border bg-muted/50 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- ورودی ---------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t bg-muted/30 p-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="ai-assistant-input" className="sr-only">
            سؤال خود را بنویسید
          </label>
          <textarea
            id="ai-assistant-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="سؤال خود را بنویسید… (Enter برای ارسال، Shift+Enter خط جدید)"
            rows={1}
            disabled={loading}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="ارسال سؤال"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                <span className="hidden sm:inline">ارسال</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
