"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function OperatorLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\d{4}$/.test(pin))
      return setError("رمز ورود باید دقیقاً چهار رقم باشد");
    setLoading(true);
    try {
      const response = await fetch("/api/operator/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.replace("/operator");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "ورود ناموفق بود",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,.32),transparent_35%),radial-gradient(circle_at_15%_85%,rgba(6,182,212,.2),transparent_30%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 shadow-xl shadow-blue-900/40">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="text-sm text-blue-200">سامانه جئو ویژن</p>
          <h1 className="mt-1 text-2xl font-black">ورود مأمور عملیاتی</h1>
          <p className="mt-2 text-sm text-slate-400">
            برای مشاهده مأموریت‌های تخصیص‌یافته وارد شوید.
          </p>
        </div>

        <Card className="border-white/10 bg-white shadow-2xl">
          <CardContent className="p-6 sm:p-7">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label
                  htmlFor="operator-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  نام و نام خانوادگی
                </label>
                <div className="relative">
                  <UserRound className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="operator-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="مثلاً علی محمدی"
                    autoComplete="name"
                    className="h-11 pr-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="operator-pin"
                  className="mb-2 block text-sm font-semibold"
                >
                  رمز چهاررقمی
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="operator-pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(event) =>
                      setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                    autoComplete="current-password"
                    dir="ltr"
                    className="h-11 px-10 text-center font-mono text-lg tracking-[.5em]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((value) => !value)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-700"
                    aria-label="نمایش رمز"
                  >
                    {showPin ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  "ورود به پنل مأمور"
                )}
              </Button>
            </form>
            <div className="mt-5 border-t pt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-slate-500 hover:text-blue-600"
              >
                ورود شهروند، مدیر یا اپراتور سازمانی
              </Link>
            </div>
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs leading-6 text-slate-500">
          اطلاعات ورود شخصی است. پس از پایان کار از پنل خارج شوید.
        </p>
      </div>
    </main>
  );
}
