import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearOperatorSessionCookie,
  setOperatorSessionCookie,
} from "@/lib/operator-auth";
import { verifyOperatorPin } from "@/lib/operator-pin";

const LoginSchema = z.object({
  name: z.string().min(3).max(80),
  pin: z.string().regex(/^\d{4}$/),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

function requestKey(req: Request, name: string) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded ?? "unknown"}:${name}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const current = attempts.get(key);
  attempts.set(key, {
    count: (current?.count ?? 0) + 1,
    resetAt: current?.resetAt ?? Date.now() + WINDOW_MS,
  });
}

export async function POST(req: Request) {
  try {
    const parsed = LoginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "نام و رمز چهاررقمی معتبر وارد کنید" },
        { status: 400 },
      );
    }

    const name = normalizeName(parsed.data.name);
    const key = requestKey(req, name);
    if (isRateLimited(key)) {
      return NextResponse.json(
        {
          error:
            "تلاش‌های ورود بیش از حد است؛ ده دقیقه دیگر دوباره امتحان کنید",
        },
        { status: 429 },
      );
    }

    const matches = await prisma.operator.findMany({
      where: { name, isActive: true },
      take: 2,
    });
    const operator = matches.length === 1 ? matches[0] : null;

    if (
      !operator?.pinHash ||
      !operator.pinSalt ||
      !verifyOperatorPin(parsed.data.pin, operator.pinHash, operator.pinSalt)
    ) {
      recordFailure(key);
      return NextResponse.json(
        { error: "نام یا رمز ورود صحیح نیست" },
        { status: 401 },
      );
    }

    attempts.delete(key);
    await prisma.operator.update({
      where: { id: operator.id },
      data: { lastLoginAt: new Date() },
    });
    await setOperatorSessionCookie({
      id: operator.id,
      name: operator.name,
      personnelCode: operator.personnelCode,
      agency: operator.agency,
    });

    return NextResponse.json({
      operator: {
        id: operator.id,
        name: operator.name,
        personnelCode: operator.personnelCode,
        agency: operator.agency,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message === "OPERATOR_SESSION_SECRET_NOT_CONFIGURED"
        ? "تنظیمات امنیتی ورود اپراتور روی سرور کامل نشده است"
        : "خطای سرور در ورود اپراتور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearOperatorSessionCookie();
  return NextResponse.json({ message: "خروج موفقیت‌آمیز بود" });
}
