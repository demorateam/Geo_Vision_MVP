import Link from "next/link";
import { Shield, MapPin, Brain, BarChart3, Users, AlertTriangle, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold leading-tight">
              سامانه مدیریت رخداد شهری
              <span className="block text-xs font-normal text-muted-foreground">مبتنی بر هوش مصنوعی</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">ورود</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">ثبت‌نام</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">پلتفرم هوشمند مدیریت شهری</Badge>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            گزارش رخدادهای شهری،
            <span className="block text-blue-600">تحلیل فوری با هوش مصنوعی</span>
          </h1>
          <p className="mt-6 text-base text-muted-foreground md:text-lg">
            شهروندان رخدادهای شهری را گزارش می‌دهند، هوش مصنوعی به‌طور خودکار نوع، شدت و سازمان مسئول را تشخیص می‌دهد و مدیران روند رسیدگی را پیگیری می‌کنند.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                ثبت رخداد جدید
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">ورود به پنل مدیریت</Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-blue-100 bg-white/60">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="mt-3 text-lg">نقشه تعاملی نشان</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                انتخاب دقیق موقعیت رخداد روی نقشه، استخراج مختصات از عکس، و جستجوی آدرس فارسی.
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-white/60">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-100">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="mt-3 text-lg">تحلیل هوشمند</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                GPT-4o عکس و توضیحات را تحلیل کرده و نوع، شدت و سازمان‌های مسئول را به‌طور خودکار تعیین می‌کند.
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-white/60">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="mt-3 text-lg">داشبورد مدیریتی</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                آمار کامل، نمودارهای تحلیلی، مدیریت رخدادها و پیگیری روند رسیدگی در یک پنل حرفه‌ای.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Roles section */}
      <section className="border-t bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-2xl font-bold">نقش‌های کاربری</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <Users className="mb-3 h-8 w-8 text-blue-600" />
                <h3 className="mb-2 font-semibold">شهروند</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>ثبت‌نام و ورود با شماره موبایل</li>
                  <li>گزارش رخداد با عکس و موقعیت</li>
                  <li>مشاهده رخدادهای ثبت شده</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Shield className="mb-3 h-8 w-8 text-purple-600" />
                <h3 className="mb-2 font-semibold">مدیر</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>مشاهده تمام رخدادها</li>
                  <li>داشبورد تحلیلی و آماری</li>
                  <li>تغییر وضعیت و مدیریت</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Building2 className="mb-3 h-8 w-8 text-green-600" />
                <h3 className="mb-2 font-semibold">اپراتور سازمان</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>مشاهده رخدادهای محول شده</li>
                  <li>به‌روزرسانی روند رسیدگی</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="mb-2 flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>سامانه مدیریت رخداد شهری مبتنی بر هوش مصنوعی</span>
          </div>
          <p>نسخه نمایشی - تمامی داده‌ها نمونه هستند</p>
        </div>
      </footer>
    </div>
  );
}
