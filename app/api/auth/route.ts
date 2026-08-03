import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, verifyOtp } from "@/lib/otp";
import { setSessionCookie } from "@/lib/auth";
import { z } from "zod";
import type { SessionUser } from "@/types";

const RequestSchema = z.object({
  action: z.enum(["request", "verify"]),
  name: z.string().min(2).optional(),
  phone: z.string().regex(/^09\d{9}$/),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }
    const { action, phone, name, code } = parsed.data;

    if (action === "request") {
      const otp = generateOtp(phone);
      return NextResponse.json({ message: "کد تایید ارسال شد", otp });
    }

    // verify
    if (!code) {
      return NextResponse.json({ error: "کد تایید الزامی است" }, { status: 400 });
    }
    if (!verifyOtp(phone, code)) {
      return NextResponse.json({ error: "کد تایید نامعتبر یا منقضی شده است" }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      if (!name) {
        return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
      }
      user = await prisma.user.create({
        data: { name, phone, role: "CITIZEN" },
      });
    }

    await setSessionCookie({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role as SessionUser["role"],
      agency: user.agency,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, agency: user.agency },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const { clearSessionCookie } = await import("@/lib/auth");
  clearSessionCookie();
  return NextResponse.json({ message: "خروج موفقیت‌آمیز بود" });
}
