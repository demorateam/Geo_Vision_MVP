import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, isDemoOtpMode, verifyOtp } from "@/lib/otp";
import { setSessionCookie } from "@/lib/auth";
import { z } from "zod";
import type { SessionUser } from "@/types";

const RequestSchema = z.object({
  action: z.enum(["request", "verify"]),
  portal: z.enum(["citizen", "admin"]).optional(),
  name: z.string().min(2).optional(),
  phone: z.string().regex(/^09\d{9}$/),
  code: z.string().optional(),
});

function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

function portalError(portal: "citizen" | "admin", role?: string) {
  if (portal === "admin") {
    return NextResponse.json(
      {
        error: "این حساب دسترسی مدیریتی یا سازمانی ندارد. لطفاً از بخش ورود کاربران وارد شوید.",
        suggestedPortal: "citizen",
      },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      error:
        role === "ADMIN"
          ? "این حساب مدیر سامانه است. لطفاً از بخش ورود به پنل مدیریتی وارد شوید."
          : "این حساب متعلق به اپراتور سازمانی است و امکان ورود از بخش کاربران را ندارد.",
      suggestedPortal: role === "ADMIN" ? "admin" : undefined,
    },
    { status: 403 },
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const { action, phone, name, code } = parsed.data;
    // Older citizen clients that do not send portal remain compatible.
    const portal = parsed.data.portal ?? "citizen";
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!name) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }

    // Validate portal before issuing an OTP. The admin portal can never create
    // a new account, and privileged accounts cannot enter via the citizen form.
    if (portal === "admin" && (!user || !["ADMIN", "AGENCY"].includes(user.role))) {
      return portalError(portal, user?.role);
    }
    if (portal === "citizen" && user && user.role !== "CITIZEN") {
      return portalError(portal, user.role);
    }

    if (user && normalizeName(user.name) !== normalizeName(name)) {
      return NextResponse.json(
        { error: "نام و شماره موبایل واردشده با یکدیگر مطابقت ندارند" },
        { status: 403 },
      );
    }

    if (action === "request") {
      const otp = generateOtp(phone);
      return NextResponse.json({
        message: isDemoOtpMode() ? "کد آزمایشی ساخته شد" : "کد تایید ارسال شد",
        demoOtp: isDemoOtpMode() ? otp : undefined,
      });
    }

    if (!code) {
      return NextResponse.json({ error: "کد تایید الزامی است" }, { status: 400 });
    }
    if (!verifyOtp(phone, code)) {
      return NextResponse.json(
        { error: "کد تایید نامعتبر یا منقضی شده است" },
        { status: 400 },
      );
    }

    // Recheck the account after OTP verification to prevent portal tampering.
    let verifiedUser = await prisma.user.findUnique({ where: { phone } });
    if (
      portal === "admin" &&
      (!verifiedUser || !["ADMIN", "AGENCY"].includes(verifiedUser.role))
    ) {
      return portalError(portal, verifiedUser?.role);
    }
    if (portal === "citizen" && verifiedUser && verifiedUser.role !== "CITIZEN") {
      return portalError(portal, verifiedUser.role);
    }

    if (!verifiedUser) {
      // New accounts are created only through the citizen portal.
      verifiedUser = await prisma.user.create({
        data: { name: normalizeName(name), phone, role: "CITIZEN" },
      });
    }

    await setSessionCookie({
      id: verifiedUser.id,
      name: verifiedUser.name,
      phone: verifiedUser.phone,
      role: verifiedUser.role as SessionUser["role"],
      agency: verifiedUser.agency,
    });

    return NextResponse.json({
      user: {
        id: verifiedUser.id,
        name: verifiedUser.name,
        phone: verifiedUser.phone,
        role: verifiedUser.role,
        agency: verifiedUser.agency,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "OTP_RATE_LIMIT") {
      return NextResponse.json(
        { error: "لطفاً ۳۰ ثانیه تا درخواست کد بعدی صبر کنید" },
        { status: 429 },
      );
    }
    const message = e instanceof Error ? e.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
  return NextResponse.json({ message: "خروج موفقیت‌آمیز بود" });
}