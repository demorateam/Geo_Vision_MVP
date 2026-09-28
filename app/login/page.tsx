"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  ArrowRight,
  Phone,
  User,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const RequestSchema = z.object({
  name: z.string().min(2, "نام حداقل ۲ کاراکتر"),
  phone: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل معتبر وارد کنید (۰۹xxxxxxxxx)"),
});

type RequestValues = z.infer<typeof RequestSchema>;
type Portal = "citizen" | "admin";

const OTP_LENGTH = 5;
const OTP_TTL_SECONDS = 120;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const toFaDigits = (value: string | number) =>
  String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

const toEnDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

const formatTimer = (seconds: number) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return toFaDigits(`${mm}:${ss}`);
};

// یک نفر (مدیر) در بالا و سه نفر کوچک‌تر در زیر آن؛ در مرحله تأیید، نفر اصلی تیک‌دار می‌شود
function OrgIcon({ verified = false }: { verified?: boolean }) {
  const Main = verified ? UserCheck : User;
  return (
    <div className="flex flex-col items-center gap-0.5 text-white">
      <Main className="h-6 w-6" />
      <div className="flex items-center gap-1">
        <User className="h-3 w-3 opacity-75" />
        <User className="h-3 w-3 opacity-75" />
        <User className="h-3 w-3 opacity-75" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100" />
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedRedirect = params.get("redirect");
  const requestedPortal = params.get("portal");

  const portal: Portal =
    requestedPortal === "admin" || requestedRedirect?.startsWith("/admin")
      ? "admin"
      : "citizen";

  const safeRedirect =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : null;

  const redirect =
    portal === "admin"
      ? safeRedirect?.startsWith("/admin")
        ? safeRedirect
        : "/admin/incidents"
      : safeRedirect &&
          !safeRedirect.startsWith("/admin") &&
          !safeRedirect.startsWith("/agency")
        ? safeRedirect
        : "/dashboard";

  const [step, setStep] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = otp.join("");
  const isExpired = secondsLeft <= 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestValues>({ resolver: zodResolver(RequestSchema) });

  // تایمر واقعی اعتبار کد (بر پایه زمان انقضا تا با سنگین شدن تب جا نماند)
  useEffect(() => {
    if (step !== "verify" || expiresAt === null) return;
    const tick = () =>
      setSecondsLeft(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, expiresAt]);

  // فوکوس خودکار روی اولین خانه کد
  useEffect(() => {
    if (step === "verify") otpRefs.current[0]?.focus();
  }, [step]);

  // برای resend در آینده: همین تابع را بعد از ارسال موفق مجدد کد صدا بزنید
  const startOtpTimer = () => {
    setExpiresAt(Date.now() + OTP_TTL_SECONDS * 1000);
    setSecondsLeft(OTP_TTL_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(""));
  };

  const onRequest = async (data: RequestValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          portal,
          phone: data.phone,
          name: data.name,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setPhone(data.phone);
      setName(data.name);
      startOtpTimer();
      setStep("verify");
      toast.success(
        result.demoOtp ? `کد آزمایشی: ${result.demoOtp}` : result.message,
        {
          description: result.demoOtp
            ? "این کد فقط برای نسخه MVP نمایش داده می‌شود"
            : "کد پیامک‌شده را وارد کنید",
          duration: 8000,
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال کد");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (isExpired) {
      toast.error("اعتبار کد به پایان رسیده است");
      return;
    }
    if (code.length !== OTP_LENGTH) {
      toast.error("کد تایید باید ۵ رقم باشد");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", portal, phone, name, code }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      if (
        portal === "admin" &&
        result.user?.role !== "ADMIN" &&
        result.user?.role !== "AGENCY"
      ) {
        throw new Error("این حساب دسترسی مدیریتی یا سازمانی ندارد");
      }
      if (portal === "citizen" && result.user?.role !== "CITIZEN") {
        throw new Error("این حساب متعلق به بخش کاربران نیست");
      }

      const destination =
        result.user.role === "AGENCY" ? "/agency/incidents" : redirect;

      toast.success("ورود موفقیت‌آمیز بود");
      router.replace(destination);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در تایید کد");
    } finally {
      setLoading(false);
    }
  };

  // پر کردن خانه‌ها از یک اندیس مشخص (تایپ، paste و auto-fill پیامک)
  const fillOtpFrom = (start: number, raw: string) => {
    const digits = toEnDigits(raw)
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH - start);
    if (!digits) return;
    setOtp((prev) => {
      const next = [...prev];
      digits.split("").forEach((d, k) => {
        next[start + k] = d;
      });
      return next;
    });
    otpRefs.current[Math.min(start + digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const onOtpChange = (index: number, value: string) => {
    if (value === "") {
      setOtp((prev) => prev.map((d, k) => (k === index ? "" : d)));
      return;
    }
    fillOtpFrom(index, value);
  };

  const onOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      e.preventDefault();
      setOtp((prev) => prev.map((d, k) => (k === index - 1 ? "" : d)));
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && code.length === OTP_LENGTH && !loading) {
      onVerify();
    }
  };

  const onOtpPaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const digits = toEnDigits(text).replace(/\D/g, "");
    fillOtpFrom(digits.length > 1 ? 0 : index, digits);
  };

  const onBack = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    setExpiresAt(null);
    // مقادیر قبلی فرم (نام کاربری و موبایل) دوباره در مرحله اول نمایش داده می‌شود
    reset({ name, phone });
    setStep("request");
  };

  const isAdminPortal = portal === "admin";
  const isVerifyStep = step === "verify";

  const secondaryLinkClass =
    "flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900";

  const operatorLinkClass =
    "flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${
              isAdminPortal ? "bg-slate-900" : "bg-blue-600"
            }`}
          >
            {isAdminPortal ? (
              <OrgIcon verified={isVerifyStep} />
            ) : isVerifyStep ? (
              <ShieldCheck className="h-7 w-7 text-white" />
            ) : (
              <Shield className="h-7 w-7 text-white" />
            )}
          </div>
          <CardTitle className="text-xl leading-8">
            {isVerifyStep
              ? "کد تأیید ۵ رقمی ارسال شده را وارد کنید"
              : isAdminPortal
                ? "ورود به پنل سازمانی"
                : "ورود کاربران"}
          </CardTitle>
          {!isVerifyStep && !isAdminPortal && (
            <CardDescription>
              برای ثبت و پیگیری رخداد شهری وارد شوید
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {step === "request" ? (
            <form onSubmit={handleSubmit(onRequest)} className="space-y-4">
              <div
                className={`rounded-lg border p-3 text-sm ${
                  isAdminPortal
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-blue-200 bg-blue-50 text-blue-900"
                }`}
              >
                {isAdminPortal
                  ? "حساب مدیر یا اپراتور سازمانی امکان ورود از این بخش را دارد."
                  : "این بخش مخصوص شهروندان و ثبت‌کنندگان رخداد است."}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  {isAdminPortal ? "نام کاربری" : "نام و نام خانوادگی"}
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder={
                      isAdminPortal
                        ? "نام کاربری خود را وارد کنید"
                        : "مثال: علی رضایی"
                    }
                    className="pr-9"
                    {...register("name")}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="09123456789"
                    className="pr-9"
                    inputMode="numeric"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "در حال بررسی..." : "دریافت کد تأیید"}
              </Button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link
                  href={
                    isAdminPortal
                      ? "/login?portal=citizen&redirect=/report"
                      : "/login?portal=admin&redirect=/admin/incidents"
                  }
                  className={secondaryLinkClass}
                >
                  {isAdminPortal ? "ورود از بخش کاربران" : "ورود به پنل مدیریتی"}
                </Link>

                <Link href="/operator/login" className={operatorLinkClass}>
                  ورود مأموران عملیاتی
                </Link>
              </div>

              <Link
                href="/"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="h-3 w-3" />
                بازگشت به خانه
              </Link>
            </form>
          ) : (
            <div className="space-y-4">
              <div
                dir="ltr"
                className="flex justify-center gap-2"
                aria-label="کد تأیید ۵ رقمی"
              >
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    value={digit}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(i, e)}
                    onPaste={(e) => onOtpPaste(i, e)}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`رقم ${toFaDigits(i + 1)}`}
                    className="h-12 w-12 px-0 text-center text-xl font-semibold"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <p className="text-muted-foreground">
                  کد به شماره {toFaDigits(phone)} ارسال شده است
                </p>
                <span
                  className={`shrink-0 tabular-nums ${
                    isExpired ? "text-destructive" : "text-muted-foreground"
                  }`}
                  aria-live="polite"
                >
                  {isExpired
                    ? "کد منقضی شد"
                    : `اعتبار کد: ${formatTimer(secondsLeft)}`}
                </span>
              </div>

              <Button
                onClick={onVerify}
                className="w-full"
                disabled={loading || isExpired}
              >
                {loading ? "در حال تایید..." : "تأیید و ورود"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full gap-1 text-gray-500 hover:text-gray-700"
                onClick={onBack}
              >
                <ArrowRight className="h-4 w-4" />
                بازگشت به صفحه قبل
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
