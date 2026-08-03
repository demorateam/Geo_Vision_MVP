"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const RequestSchema = z.object({
  name: z.string().min(2, "نام حداقل ۲ کاراکتر"),
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر وارد کنید (۰۹xxxxxxxxx)"),
});

type RequestValues = z.infer<typeof RequestSchema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
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
        body: JSON.stringify({ action: "request", phone: data.phone, name: data.name }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setPhone(data.phone);
      setName(data.name);
      setStep("verify");
      toast.success(`کد تایید: ${result.otp}`, {
        description: "کد تایید (شبیه‌سازی پیامک) برای ورود وارد کنید",
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
        body: JSON.stringify({ action: "verify", phone, name, code }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success("ورود موفقیت‌آمیز بود");
      router.push(redirect);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در تایید کد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl">ورود به سامانه</CardTitle>
          <CardDescription>سامانه مدیریت رخداد شهری مبتنی بر هوش مصنوعی</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "request" ? (
            <form onSubmit={handleSubmit(onRequest)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">نام و نام خانوادگی</Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="name" placeholder="مثال: علی رضایی" className="pr-9" {...register("name")} />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" placeholder="09123456789" className="pr-9" inputMode="numeric" {...register("phone")} />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "در حال ارسال..." : "دریافت کد تایید"}
              </Button>
              <Link href="/" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
                <p className="text-center text-xs text-muted-foreground">کد به شماره {phone} ارسال شد</p>
              </div>
              <Button onClick={onVerify} className="w-full" disabled={loading}>
                {loading ? "در حال تایید..." : "تایید و ورود"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("request")}>
                تغییر شماره
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
