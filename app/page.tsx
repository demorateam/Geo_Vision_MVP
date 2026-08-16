import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  Building2,
  CheckCircle2,
  CircleGauge,
  Database,
  Layers3,
  MapPin,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TypewriterWord } from "@/components/home/TypewriterWord";

const challenges = [
  "گزارش‌های میدانی پراکنده و فاقد اطلاعات مکانی دقیق",
  "ارجاع دستی و زمان‌بر رخدادها میان واحدهای اجرایی",
  "نبود دید یکپارچه برای تحلیل، اولویت‌بندی و تصمیم‌گیری",
];

const benefits = [
  "کاهش زمان رسیدگی به رخدادهای شهری",
  "کاهش اعزام‌های غیرضروری نیروهای میدانی",
  "افزایش بهره‌وری واحدهای اجرایی",
  "ایجاد بانک اطلاعاتی مستند و مکان‌محور",
];

type AnimatedCityBackgroundProps = {
  idPrefix: string;
  dark?: boolean;
  strong?: boolean;
};

function AnimatedCityBackground({
  idPrefix,
  dark = false,
  strong = false,
}: AnimatedCityBackgroundProps) {
  const nodes = [
    [150, 190],
    [320, 430],
    [520, 275],
    [720, 390],
    [920, 205],
    [1120, 345],
    [1320, 185],
  ];

  const routeOne = "M-120 470 C150 270, 330 590, 610 355 S1050 170, 1560 320";
  const routeTwo = "M-100 160 C210 390, 430 90, 735 280 S1160 535, 1540 170";
  const routeThree = "M120 760 C220 500, 470 550, 590 325 S790 80, 1010 -80";

  const primary = dark ? "#38bdf8" : "#2563eb";
  const secondary = dark ? "#a78bfa" : "#7c3aed";
  const cyan = dark ? "#22d3ee" : "#0891b2";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden ${
        strong ? "opacity-100" : "opacity-80"
      }`}
      aria-hidden="true"
    >
      <div
        className={
          dark
            ? "absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(96,165,250,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,165,250,0.14)_1px,transparent_1px)] [background-size:68px_68px]"
            : "absolute inset-0 opacity-[0.38] [background-image:linear-gradient(to_right,rgba(59,130,246,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.10)_1px,transparent_1px)] [background-size:68px_68px]"
        }
      />

      <div
        className={`absolute -right-28 top-[8%] h-80 w-80 animate-pulse rounded-full blur-[110px] [animation-duration:7s] ${
          dark ? "bg-blue-500/15" : "bg-blue-300/25"
        }`}
      />
      <div
        className={`absolute -left-24 bottom-[4%] h-96 w-96 animate-pulse rounded-full blur-[120px] [animation-delay:1.4s] [animation-duration:9s] ${
          dark ? "bg-cyan-400/10" : "bg-cyan-200/25"
        }`}
      />
      <div
        className={`absolute left-[42%] top-[26%] h-72 w-72 animate-pulse rounded-full blur-[120px] [animation-delay:2.5s] [animation-duration:11s] ${
          dark ? "bg-violet-500/10" : "bg-violet-200/20"
        }`}
      />

      <div
        className={`absolute -right-20 top-[38%] h-64 w-64 animate-[spin_32s_linear_infinite] rounded-full border border-dashed ${
          dark ? "border-cyan-300/10" : "border-blue-400/15"
        }`}
      />
      <div
        className={`absolute -left-28 bottom-[12%] h-80 w-80 animate-[spin_42s_linear_infinite_reverse] rounded-full border border-dashed ${
          dark ? "border-violet-300/10" : "border-violet-400/10"
        }`}
      />

      <svg
        viewBox="0 0 1440 700"
        preserveAspectRatio="xMidYMid slice"
        className={`absolute left-1/2 top-1/2 h-full w-[185%] -translate-x-1/2 -translate-y-1/2 sm:w-[140%] lg:w-full ${
          dark ? "opacity-55" : "opacity-45"
        }`}
      >
        <defs>
          <linearGradient id={`${idPrefix}-route-a`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={primary} stopOpacity="0" />
            <stop
              offset="45%"
              stopColor={primary}
              stopOpacity={dark ? "0.65" : "0.38"}
            />
            <stop offset="100%" stopColor={cyan} stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${idPrefix}-route-b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={secondary} stopOpacity="0" />
            <stop
              offset="50%"
              stopColor={secondary}
              stopOpacity={dark ? "0.50" : "0.28"}
            />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={routeOne}
          fill="none"
          stroke={`url(#${idPrefix}-route-a)`}
          strokeWidth={dark ? "2.2" : "1.8"}
          strokeDasharray="10 15"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-50"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d={routeTwo}
          fill="none"
          stroke={`url(#${idPrefix}-route-b)`}
          strokeWidth="1.7"
          strokeDasharray="7 17"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="48"
            dur="6.5s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d={routeThree}
          fill="none"
          stroke={primary}
          strokeOpacity={dark ? "0.25" : "0.14"}
          strokeWidth="1.5"
          strokeDasharray="6 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-44"
            dur="5.5s"
            repeatCount="indefinite"
          />
        </path>

        {nodes.map(([cx, cy], index) => (
          <g key={`${idPrefix}-${cx}-${cy}`}>
            <circle
              cx={cx}
              cy={cy}
              r="4"
              fill={
                index % 3 === 0 ? secondary : index % 2 === 0 ? cyan : primary
              }
              opacity={dark ? "0.8" : "0.58"}
            />
            <circle
              cx={cx}
              cy={cy}
              r="5"
              fill="none"
              stroke={index % 3 === 0 ? secondary : primary}
              strokeWidth="1"
            >
              <animate
                attributeName="r"
                values="5;20;5"
                dur={`${2.8 + index * 0.35}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.55;0;0.55"
                dur={`${2.8 + index * 0.35}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}

        <circle r="4" fill={cyan} opacity="0.9">
          <animateMotion dur="7s" repeatCount="indefinite" path={routeOne} />
        </circle>
        <circle r="3.5" fill={secondary} opacity="0.85">
          <animateMotion dur="9s" repeatCount="indefinite" path={routeTwo} />
        </circle>
        <circle r="3" fill={primary} opacity="0.8">
          <animateMotion dur="8s" repeatCount="indefinite" path={routeThree} />
        </circle>
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <div
      className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950"
      dir="rtl"
      style={{
        fontFamily: "'B Nazanin', 'BNazanin', Tahoma, sans-serif",
      }}
    >
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-[#061126] text-white">
        <AnimatedCityBackground idPrefix="hero" dark strong />
        {/* Decorative background */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-48 left-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

        {/* Header */}
        <header className="relative z-20 border-b border-white/10">
          <div className="container mx-auto flex min-h-[76px] items-center justify-between gap-4 px-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <Shield className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="font-bold text-white">سامانه مدیریت رخداد شهری</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Urban Event Management Platform
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/login?portal=citizen">
                <Button
                  variant="ghost"
                  className="text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  ورود
                </Button>
              </Link>

              <Link href="/register">
                <Button className="bg-blue-600 text-white hover:bg-blue-500">
                  ثبت رخداد
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="container relative z-10 mx-auto px-4 pb-24 pt-16 md:pb-32 md:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {/* Hero text */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-base text-blue-200">
                <Sparkles className="h-4 w-4" />
                نسل جدید مدیریت هوشمند شهری
              </div>

              <h1 className="max-w-2xl text-5xl font-black leading-[1.45] md:text-6xl lg:text-7xl">
                <span className="block">هوش مصنوعی در</span>
                <span className="mt-4 block h-[3.2em] pr-2 text-blue-400 sm:h-[1.6em] sm:pr-14 md:mt-6 md:pr-[5.5rem]">
                  <TypewriterWord
                    words={[
                      "خدمت به شهر",
                      "قلب مدیریت شهری",
                      "تصمیم‌گیری سریع",
                      "ثبت رخداد شهری",
                      "تشخیص رخداد شهری",
                    ]}
                  />
                </span>
              </h1>

              <div className="mt-12 flex flex-col gap-3 md:mt-14 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-14 gap-2 bg-blue-600 px-7 text-lg text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500"
                  >
                    ثبت رخداد جدید
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>

                <Link href="/login?portal=admin&redirect=/admin/incidents">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 border-white/20 bg-white/5 px-7 text-lg text-white hover:bg-white/10 hover:text-white"
                  >
                    ورود به پنل مدیریت
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  "تحلیل هوشمند",
                  "نقشه مکانی",
                  "گردش کار",
                  "داشبورد مدیریتی",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-base text-slate-400"
                  >
                    <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                    {item}
                  </div>
                ))}
              </div>

              {/* ===== NEW: Powered by Demora team ===== */}
              <div className="mt-12 flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-700" />
                <p className="text-sm font-medium text-slate-500">
                  Powered by{" "}
                  <span className="font-semibold text-blue-400">Demora team</span>
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-700" />
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative mx-auto w-[96%] max-w-[680px] origin-center sm:w-full lg:mx-0">
              <div className="absolute -inset-5 rounded-[36px] bg-blue-500/10 blur-2xl" />

              <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-900/80 p-2 shadow-2xl shadow-black/40">
                <div className="mb-2 flex items-center justify-between px-3 py-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>

                  <span className="text-sm text-slate-500">
                    UEMP Command Center
                  </span>
                </div>

                <div className="overflow-hidden rounded-[20px]">
                  <Image
                    src="/images/uemp/command-center.jpg"
                    alt="مرکز فرماندهی هوشمند شهری"
                    width={1937}
                    height={1090}
                    priority
                    className="h-auto w-full object-cover"
                  />
                </div>
              </div>

              {/* Floating map */}
              <div className="absolute -bottom-12 -right-5 hidden w-[210px] overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-1.5 shadow-2xl md:block">
                <Image
                  src="/images/uemp/live-event-map.jpg"
                  alt="نقشه زنده رخدادها"
                  width={1937}
                  height={1090}
                  className="rounded-xl"
                />

                <div className="flex items-center gap-2 px-2 pb-2 pt-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>

                  <span className="text-sm text-slate-300">
                    پایش زنده رخدادهای شهری
                  </span>
                </div>
              </div>

              {/* AI badge */}
              <div className="absolute -left-4 top-12 hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#0c1b36]/95 px-4 py-3 shadow-xl backdrop-blur md:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
                  <Brain className="h-5 w-5 text-purple-400" />
                </div>

                <div>
                  <p className="text-sm text-slate-400">AI Engine</p>
                  <p className="mt-0.5 text-base font-semibold text-white">
                    تحلیل خودکار رخداد
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== AI WORKFLOW ==================== */}
      <section className="relative overflow-hidden bg-[#f1f5f9] py-20 md:py-28">
        <AnimatedCityBackground idPrefix="ai-workflow" strong />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mb-12 max-w-3xl">
            <div className="text-xl font-black text-blue-600 md:text-2xl">
              <Brain className="h-5 w-5" />
              هوش مصنوعی در قلب عملیات
            </div>

            <h2 className="text-3xl font-black leading-[1.6] md:text-4xl">
              از یک گزارش ساده،
              <br />
              تا یک تصمیم عملیاتی هوشمند
            </h2>
          </div>

          <div className="grid overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-950/5 lg:grid-cols-2">
            {/* Image */}
            <div className="relative min-h-[380px] lg:min-h-[560px]">
              <Image
                src="/images/uemp/ai-analysis.jpg"
                alt="تحلیل هوشمند رخداد شهری"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

              <div className="absolute bottom-6 right-6 rounded-2xl border border-white/20 bg-slate-950/60 px-5 py-4 text-white backdrop-blur-md">
                <div className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  تحلیل تصویر و اطلاعات رخداد
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="flex flex-col justify-center p-7 md:p-12">
              {[
                {
                  icon: MapPin,
                  number: "1",
                  title: "ثبت و مکان‌یابی",
                  text: "ثبت تصویر، توضیحات و اطلاعات مکانی رخداد در یک فرآیند سریع و یکپارچه.",
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: Brain,
                  number: "2",
                  title: "تحلیل با هوش مصنوعی",
                  text: "بررسی خودکار داده‌ها برای تشخیص نوع رخداد، شدت و واحدهای مرتبط.",
                  color: "bg-purple-50 text-purple-600",
                },
                {
                  icon: Workflow,
                  number: "3",
                  title: "ارجاع و پیگیری",
                  text: "هدایت رخداد به واحد مسئول و پایش چرخه رسیدگی تا بسته شدن پرونده.",
                  color: "bg-green-50 text-green-600",
                },
              ].map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.number}
                    className={`relative flex gap-5 ${
                      index !== 2 ? "pb-10" : ""
                    }`}
                  >
                    {index !== 2 && (
                      <div className="absolute right-6 top-12 h-[calc(100%-30px)] w-px bg-slate-200" />
                    )}

                    <div
                      className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${step.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <span className="text-sm font-bold text-slate-400">
                        {step.number}
                      </span>

                      <h3 className="mt-1 text-lg font-bold">{step.title}</h3>

                      <p className="mt-2 leading-7 text-slate-500">
                        {step.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== COMMAND CENTER ==================== */}
      <section className="relative overflow-hidden bg-white py-20 md:py-28">
        <AnimatedCityBackground idPrefix="command-center" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 text-base font-bold text-blue-600">
              <CircleGauge className="h-5 w-5" />
              مرکز فرماندهی هوشمند
            </div>

            <h2 className="text-3xl font-black leading-[1.6] md:text-4xl">
              همه‌چیز در یک نگاه،
              <span className="text-blue-600"> برای یک تصمیم بهتر</span>
            </h2>

            <p className="mt-4 leading-8 text-slate-500">
              مدیران به جای بررسی پراکنده گزارش‌ها، تصویر یکپارچه‌ای از وضعیت
              شهر، رخدادها و فرآیند رسیدگی در اختیار دارند.
            </p>
          </div>

          {/* Bento */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Map */}
            <div className="group overflow-hidden rounded-[28px] bg-[#071426] lg:col-span-7">
              <div className="p-6 text-white md:p-8">
                <div className="mb-2 flex items-center gap-2 text-base text-cyan-300">
                  <MapPin className="h-4 w-4" />
                  نظارت لحظه‌ای
                </div>

                <h3 className="text-2xl font-bold">نقشه زنده رخدادهای شهری</h3>
              </div>
              <div className="px-3 pb-3">
                <Image
                  src="/images/uemp/live-event-map.jpg"
                  alt="نقشه زنده رخدادهای شهری"
                  width={1937}
                  height={1090}
                  className="w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </div>

            {/* KPI */}
            <div className="group overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 lg:col-span-5">
              <div className="p-6 md:p-8">
                <div className="mb-2 flex items-center gap-2 text-base font-bold text-blue-600">
                  <BarChart3 className="h-4 w-4" />
                  تحلیل مدیریتی
                </div>

                <h3 className="text-2xl font-bold">شاخص‌های کلیدی عملکرد</h3>

                <p className="mt-3 leading-7 text-slate-500">
                  رصد روند عملکرد و ارزیابی فرآیندهای اجرایی بر اساس داده‌های
                  عملیاتی.
                </p>
              </div>

              <div className="px-3 pb-3">
                <Image
                  src="/images/uemp/kpi-dashboard.jpg"
                  alt="داشبورد شاخص‌های کلیدی عملکرد"
                  width={1937}
                  height={1090}
                  className="w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </div>

            {/* Heat Map */}
            <div className="group overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 lg:col-span-7">
              <div className="grid h-full md:grid-cols-[0.8fr_1.2fr] md:items-center">
                <div className="p-7 md:p-8">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                    <MapPin className="h-5 w-5 text-red-500" />
                  </div>

                  <h3 className="text-xl font-bold">تحلیل مکانی پیشرفته</h3>

                  <p className="mt-3 leading-7 text-slate-500">
                    شناسایی نقاط پرتکرار و محدوده‌های بحرانی با Heat Map برای
                    تخصیص بهتر منابع.
                  </p>
                </div>

                <div className="p-3">
                  <Image
                    src="/images/uemp/heat-map.jpg"
                    alt="نقشه حرارتی رخدادهای شهری"
                    width={1937}
                    height={1052}
                    className="w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>

            {/* Workflow */}
            <div className="group overflow-hidden rounded-[28px] bg-blue-600 lg:col-span-5">
              <div className="p-7 text-white">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <Workflow className="h-5 w-5" />
                </div>

                <h3 className="text-xl font-bold">موتور گردش کار و تیکت</h3>

                <p className="mt-3 leading-7 text-blue-100">
                  مدیریت چرخه رخداد از ارجاع اولیه تا اقدام اجرایی و بسته شدن
                  پرونده.
                </p>
              </div>

              <div className="px-3 pb-3">
                <Image
                  src="/images/uemp/workflow-board.jpg"
                  alt="گردش کار رخدادهای شهری"
                  width={1457}
                  height={938}
                  className="w-full rounded-[20px] transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== APPLICATIONS ==================== */}
      <section className="relative overflow-hidden bg-[#071426] py-20 text-white md:py-28">
        <AnimatedCityBackground idPrefix="applications" dark strong />
        <div className="pointer-events-none absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="container relative z-10 mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xl font-black text-blue-600 md:text-2xl">
                یک زیرساخت، چندین کاربرد
              </p>

              <h2 className="mt-3 text-3xl font-black leading-[1.6] md:text-4xl">
                از خدمات روزمره شهری،
                <br />
                تا زیرساخت‌های حیاتی
              </h2>

              <p className="mt-5 max-w-xl leading-8 text-slate-400">
                ساختار UEMP محدود به یک نوع رخداد نیست و می‌تواند در حوزه‌های
                مختلف خدمات شهری و مدیریت بحران به کار گرفته شود.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  "مدیریت پسماند",
                  "آسفالت و معابر",
                  "روشنایی شهری",
                  "فضای سبز",
                  "مدیریت بحران",
                  "زیرساخت‌های حیاتی",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-base text-slate-300"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-2">
              <Image
                src="/images/uemp/city-services.jpg"
                alt="کاربردهای پلتفرم در خدمات شهری"
                width={1937}
                height={1090}
                className="w-full rounded-[22px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== VISION ==================== */}
      <section className="relative overflow-hidden bg-white py-20 md:py-28">
        <AnimatedCityBackground idPrefix="vision" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>

              <p className="text-xl font-black text-blue-600 md:text-2xl">چشم‌انداز UEMP</p>

              <h2 className="mt-3 text-3xl font-black leading-[1.6] md:text-4xl">
                از مدیریت واکنشی،
                <br />
                به مدیریت
                <span className="text-blue-600"> پیشگیرانه و داده‌محور</span>
              </h2>

              <p className="mt-5 max-w-xl leading-8 text-slate-500">
                UEMP یک سامانه گزارش‌گیری ساده نیست. این پلتفرم اطلاعات میدانی،
                داده‌های مکانی، هوش مصنوعی و گردش کار سازمانی را در یک زیرساخت
                واحد به هم متصل می‌کند.
              </p>
            </div>

            <div className="grid gap-4">
              {challenges.map((item, index) => (
                <div
                  key={item}
                  className="group flex items-start gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-950/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-black text-blue-600 shadow-sm">
                    {index + 1}
                  </div>

                  <p className="pt-2 leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== INTEGRATION & SECURITY ==================== */}
      <section className="relative overflow-hidden bg-[#f8fafc] py-20 md:py-28">
        <AnimatedCityBackground idPrefix="integration" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mb-12 max-w-3xl">
            <p className="text-xl font-black text-blue-600 md:text-2xl">
              آماده برای ساختار سازمانی
            </p>

            <h2 className="mt-3 text-3xl font-black leading-[1.6] md:text-4xl">
              یکپارچه، توسعه‌پذیر و امن
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Integration */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3">
              <Image
                src="/images/uemp/integration.jpg"
                alt="یکپارچگی سامانه مدیریت شهری"
                width={1937}
                height={1090}
                className="w-full rounded-[20px]"
              />

              <div className="p-5 md:p-7">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>

                <h3 className="text-xl font-bold">اتصال به سامانه‌های موجود</h3>

                <p className="mt-3 leading-7 text-slate-500">
                  امکان قرارگیری UEMP به عنوان یک لایه هوشمند در کنار
                  سامانه‌هایی مانند GIS، سامانه ۱۳۷ و سایر زیرساخت‌های سازمانی.
                </p>
              </div>
            </div>

            {/* Security */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3">
              <Image
                src="/images/uemp/security.jpg"
                alt="امنیت سازمانی پلتفرم"
                width={1937}
                height={1090}
                className="w-full rounded-[20px]"
              />

              <div className="p-5 md:p-7">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>

                <h3 className="text-xl font-bold">معماری مناسب محیط سازمانی</h3>

                <p className="mt-3 leading-7 text-slate-500">
                  قابلیت استقرار متناسب با زیرساخت سازمان و توسعه مرحله‌ای
                  پلتفرم برای محیط‌های عملیاتی شهری.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ROI / MVP ==================== */}
      <section className="relative overflow-hidden bg-white py-20 md:py-28">
        <AnimatedCityBackground idPrefix="roi" strong />
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="text-xl font-black text-blue-600 md:text-2xl">
                <Zap className="h-5 w-5" />
                ارزش عملیاتی
              </div>

              <h2 className="text-3xl font-black leading-[1.6] md:text-4xl">
                فناوری زمانی ارزشمند است
                <br />
                که نتیجه عملیاتی ایجاد کند.
              </h2>

              <div className="mt-8 space-y-4">
                {benefits.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />

                    <p className="leading-7 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50 p-3 shadow-xl shadow-slate-950/5">
              <Image
                src="/images/uemp/mvp-roadmap.jpg"
                alt="نقشه راه استقرار پروژه UEMP"
                width={1937}
                height={1090}
                className="w-full rounded-[22px]"
              />

              <div className="flex items-start gap-4 p-5 md:p-7">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <Layers3 className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h3 className="font-bold">شروع سریع، توسعه مرحله‌ای</h3>

                  <p className="mt-2 text-base leading-7 text-slate-500">
                    امکان آغاز با نسخه MVP و توسعه قابلیت‌های هوشمند متناسب با
                    نیاز عملیاتی سازمان.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="relative overflow-hidden px-4 pb-20 pt-4 md:pb-28">
        <AnimatedCityBackground idPrefix="final-cta" />
        <div className="container relative z-10 mx-auto">
          <div className="relative overflow-hidden rounded-[32px] bg-blue-600 px-6 py-14 text-center text-white md:px-12 md:py-20">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />

            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Building2 className="h-7 w-7" />
              </div>

              <h2 className="text-3xl font-black leading-[1.6] md:text-4xl">
                یک قدم به مدیریت هوشمندتر شهر
              </h2>

              <p className="mx-auto mt-4 max-w-2xl leading-8 text-blue-100">
                یک بستر یکپارچه برای مشاهده، تحلیل و مدیریت رخدادهای شهری؛ از
                میدان تا مرکز تصمیم‌گیری.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-14 gap-2 bg-white px-7 text-blue-700 hover:bg-blue-50"
                  >
                    شروع ثبت رخداد
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>

                <Link href="/login?portal=admin&redirect=/admin/incidents">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 border-white/30 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
                  >
                    ورود به پنل مدیریت
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-base text-slate-500 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Shield className="h-4 w-4 text-white" />
            </div>

            <div>
              <p className="font-semibold text-slate-700">UEMP</p>
              <p className="text-sm">Urban Event Management Platform</p>
            </div>
          </div>

          <p>سامانه یکپارچه مدیریت هوشمند رخدادهای شهری</p>
        </div>
      </footer>
    </div>
  );
}
