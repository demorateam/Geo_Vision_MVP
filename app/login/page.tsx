"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Shield, ArrowRight, Phone, User } from "lucide-react";
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
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر وارد کنید (۰۹xxxxxxxxx)"),
});

type RequestValues = z.infer<typeof RequestSchema>;
type Portal = "citizen" | "admin";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100" />}>
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
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestValues>({ resolver: zodResolver(RequestSchema) });

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
      setStep("verify");
      toast.success(result.demoOtp ? `کد آزمایشی: ${result.demoOtp}` : result.message, {
        description: result.demoOtp
          ? "این کد فقط برای نسخه MVP نمایش داده می‌شود"
          : "کد پیامک‌شده را وارد کنید",
        duration: 8000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ارسال کد");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (code.length !== 5) {
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

  const isAdminPortal = portal === "admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
              isAdminPortal ? "bg-slate-900" : "bg-blue-600"
            }`}
          >
            <Shield className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl">
            {isAdminPortal ? "ورود مدیر و اپراتور سازمانی" : "ورود کاربران"}
          </CardTitle>
          <CardDescription>
            {isAdminPortal
              ? "این بخش برای مدیر سامانه و اپراتورهای سازمانی است"
              : "برای ثبت و پیگیری رخداد شهری وارد شوید"}
          </CardDescription>
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
                <Label htmlFor="name">نام و نام خانوادگی</Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder={isAdminPortal ? "نام مدیر یا اپراتور" : "مثال: علی رضایی"}
                    className="pr-9"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "در حال بررسی..." : "دریافت کد تایید"}
              </Button>

              <Link
                href={
                  isAdminPortal
                    ? "/login?portal=citizen&redirect=/report"
                    : "/login?portal=admin&redirect=/admin/incidents"
                }
                className="block text-center text-sm text-blue-600 hover:text-blue-700"
              >
                {isAdminPortal ? "ورود از بخش کاربران" : "ورود به پنل مدیریتی"}
              </Link>

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
              <div className="space-y-2">
                <Label>کد تایید ۵ رقمی</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="-----"
                  className="text-center text-2xl tracking-widest"
                  inputMode="numeric"
                  maxLength={5}
                />
                <p className="text-center text-xs text-muted-foreground">
                  کد به شماره {phone} ارسال شد
                </p>
              </div>
              <Button onClick={onVerify} className="w-full" disabled={loading}>
                {loading ? "در حال تایید..." : "تایید و ورود"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCode("");
                  setStep("request");
                }}
              >
                تغییر شماره
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}