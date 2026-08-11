"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  ListChecks,
  Clock3,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Building2,
  ShieldAlert,
  ArrowUpLeft,
  Radio,
  MapPin,
} from "lucide-react";

interface Stats {
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };

  byRegion: {
    region: string;
    _count: {
      _all: number;
    };
  }[];

  bySeverity: {
    severity: string;
    _count: {
      _all: number;
    };
  }[];

  byAgency: {
    agencyName: string;
    _count: {
      _all: number;
    };
  }[];
}

/* =========================================================
   SEVERITY
========================================================= */

const SEVERITY_LABELS: Record<string, string> = {
  Low: "کم",
  Medium: "متوسط",
  High: "زیاد",
  Critical: "بحرانی",
};

const SEVERITY_COLORS: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};

/* =========================================================
   AGENCY COLORS
========================================================= */

const AGENCY_COLORS = [
  "#2563eb",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#64748b",
];

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export function AdminDashboard({ stats }: { stats: Stats }) {
  /* =======================================================
     REGION DATA
  ======================================================== */

  const regionData = stats.byRegion.map((r) => ({
    name: r.region,
    count: r._count._all,
  }));

  /* =======================================================
     SEVERITY DATA

     originalName برای پیدا کردن رنگ اصلی استفاده می‌شود.
     name برای نمایش فارسی در نمودار و Legend استفاده می‌شود.
  ======================================================== */

  const severityData = stats.bySeverity.map((s) => ({
    name: SEVERITY_LABELS[s.severity] ?? s.severity,
    originalName: s.severity,
    value: s._count._all,
  }));

  /* =======================================================
     TOTAL SEVERITY
  ======================================================== */

  const totalSeverity = severityData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  /* =======================================================
     AGENCY DATA
  ======================================================== */

  const agencyData = stats.byAgency.map((a) => ({
    name: a.agencyName,
    count: a._count._all,
  }));

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-5 md:p-7"
    >
      <div className="mx-auto max-w-[1800px]">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600 shadow-lg shadow-blue-500/40" />

                <span className="text-[11px] font-black tracking-[0.18em] text-blue-600">
                  GEOVISION • CONTROL CENTER
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                پنل مدیریت
              </h1>

              <p className="mt-2 text-sm font-medium text-slate-500">
                نمای کلی و تحلیل هوشمند رخدادهای شهری
              </p>
            </div>

            {/* Live Status */}

            <div
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-slate-200
                bg-white
                px-5
                py-3
                shadow-sm
              "
            >
              <div className="relative">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30" />

                <span className="relative block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>

              <div>
                <div className="text-xs font-black text-slate-800">
                  سیستم فعال
                </div>

                <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                  پایش لحظه‌ای سامانه
                </div>
              </div>
            </div>
          </div>

          {/* Header separator */}

          <div className="mt-6 h-px bg-gradient-to-l from-transparent via-slate-300 to-transparent" />
        </header>

        {/* =====================================================
            QUICK INFO
        ====================================================== */}

        <div className="mb-7 flex flex-wrap gap-3">

          <InfoPill
            icon={Radio}
            text="سامانه آنلاین"
          />

          <InfoPill
            icon={MapPin}
            text="پایش مناطق شهری"
          />

          <InfoPill
            icon={Activity}
            text={`${stats.counts.total} رخداد ثبت شده`}
          />

        </div>

        {/* =====================================================
            STAT SECTION
        ====================================================== */}

        <section className="mb-10">

          <SectionTitle
            eyebrow="OVERVIEW"
            title="وضعیت کلی رخدادها"
            description="نمای سریع از وضعیت عملیاتی سامانه"
          />

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

            <PremiumStatCard
              icon={ListChecks}
              label="کل رخدادها"
              value={stats.counts.total}
              description="تمام رخدادهای ثبت‌شده"
              color="blue"
              index="01"
            />

            <PremiumStatCard
              icon={Clock3}
              label="در انتظار"
              value={stats.counts.pending}
              description="رخدادهای نیازمند بررسی"
              color="amber"
              index="02"
            />

            <PremiumStatCard
              icon={AlertCircle}
              label="در حال انجام"
              value={stats.counts.inProgress}
              description="رخدادهای در حال پیگیری"
              color="orange"
              index="03"
            />

            <PremiumStatCard
              icon={CheckCircle2}
              label="حل شده"
              value={stats.counts.resolved}
              description="رخدادهای به پایان رسیده"
              color="green"
              index="04"
            />

          </div>
        </section>

        {/* =====================================================
            ANALYTICS
        ====================================================== */}

        <section>

          <SectionTitle
            eyebrow="ANALYTICS"
            title="تحلیل و گزارش رخدادها"
            description="تصویری جامع از پراکندگی و شدت رخدادهای شهری"
          />

          <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* =================================================
                REGION CHART
            ================================================== */}

            <PremiumChartCard
              title="رخدادها بر اساس منطقه"
              description="پراکندگی تعداد رخدادهای ثبت‌شده در مناطق مختلف"
              icon={TrendingUp}
              accent="blue"
              badge="REGION"
            >

              <ResponsiveContainer
                width="100%"
                height={340}
              >

                <BarChart
                  data={regionData}
                  margin={{
                    top: 20,
                    right: 10,
                    left: 0,
                    bottom: 20,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#cbd5e1"
                    opacity={0.55}
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
                    height={55}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(37,99,235,0.05)",
                    }}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      boxShadow:
                        "0 18px 45px rgba(15,23,42,0.14)",
                      direction: "rtl",
                    }}
                    formatter={(value) => [
                      value,
                      "تعداد رخداد",
                    ]}
                  />

                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    name="تعداد رخداد"
                    radius={[10, 10, 3, 3]}
                    barSize={42}
                  />

                </BarChart>

              </ResponsiveContainer>

            </PremiumChartCard>

            {/* =================================================
                SEVERITY CHART
            ================================================== */}

            <PremiumChartCard
              title="توزیع شدت رخدادها"
              description="تحلیل سطح اهمیت و شدت رخدادهای ثبت‌شده"
              icon={ShieldAlert}
              accent="red"
              badge="SEVERITY"
            >

              <ResponsiveContainer
                width="100%"
                height={340}
              >

                <PieChart>

                  {/* ================================
                      PIE
                  ================================= */}

                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={112}
                    innerRadius={65}
                    paddingAngle={4}
                    stroke="#ffffff"
                    strokeWidth={4}
                  >

                    {severityData.map(
                      (entry, index) => (
                        <Cell
                          key={`severity-${index}`}
                          fill={
                            SEVERITY_COLORS[
                              entry.originalName
                            ] ?? "#94a3b8"
                          }
                        />
                      )
                    )}

                  </Pie>

                  {/* ================================
                      CENTER TOTAL
                  ================================= */}

                  <text
                    x="50%"
                    y="42%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-900"
                    style={{
                      fontSize: "30px",
                      fontWeight: 900,
                    }}
                  >
                    {totalSeverity}
                  </text>

                  <text
                    x="50%"
                    y="53%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-400"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    کل رخدادها
                  </text>

                  {/* ================================
                      TOOLTIP
                  ================================= */}

                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      `شدت: ${name}`,
                    ]}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      boxShadow:
                        "0 18px 45px rgba(15,23,42,0.14)",
                      direction: "rtl",
                    }}
                  />

                  {/* ================================
                      LEGEND
                  ================================= */}

                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    height={45}
                    iconType="circle"
                    formatter={(value) => (
                      <span
                        style={{
                          color: "#334155",
                          fontSize: "12px",
                          fontWeight: 700,
                          marginRight: "4px",
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />

                </PieChart>

              </ResponsiveContainer>

            </PremiumChartCard>

            {/* =================================================
                AGENCY CHART
            ================================================== */}

            <div className="xl:col-span-2">

              <PremiumChartCard
                title="رخدادها بر اساس سازمان"
                description="توزیع رخدادهای ثبت‌شده میان سازمان‌ها و واحدهای مسئول"
                icon={Building2}
                accent="purple"
                badge="AGENCIES"
                large
              >
                <div className="w-full overflow-x-auto">
  <div className="min-w-[850px]">

    <div className="grid grid-cols-[220px_1fr] gap-6">

      {/* ================================
          ORGANIZATION NAMES
      ================================= */}

      <div className="flex flex-col justify-around py-4">

        {agencyData.map((agency, index) => (
          <div
            key={`agency-label-${index}`}
            className="
              flex
              min-h-[38px]
              items-center
              rounded-xl
              border
              border-slate-100
              bg-slate-50
              px-4
              text-right
              transition-all
              duration-300
              hover:border-slate-200
              hover:bg-white
              hover:shadow-sm
            "
          >
            <span
              className="
                truncate
                text-xs
                font-bold
                text-slate-700
              "
              title={agency.name}
            >
              {agency.name}
            </span>
          </div>
        ))}

      </div>

      {/* ================================
          CHART
      ================================= */}

      <div className="min-w-0">

        <ResponsiveContainer
          width="100%"
          height={390}
        >

          <BarChart
            data={agencyData}
            layout="vertical"
            margin={{
              top: 15,
              right: 20,
              left: 10,
              bottom: 15,
            }}
          >

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#cbd5e1"
              opacity={0.55}
              horizontal={false}
            />

            <XAxis
              type="number"
              tick={{
                fontSize: 11,
                fill: "#64748b",
              }}
              axisLine={false}
              tickLine={false}
            />

            {/* 
              YAxis فقط برای ساختن ردیف‌هاست.
              متن را نمایش نمی‌دهیم.
            */}

            <YAxis
              type="category"
              dataKey="name"
              hide
            />

            <Tooltip
              cursor={{
                fill: "rgba(124,58,237,0.04)",
              }}
              contentStyle={{
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                boxShadow:
                  "0 18px 45px rgba(15,23,42,0.14)",
                direction: "rtl",
              }}
              formatter={(value) => [
                value,
                "تعداد رخداد",
              ]}
            />

            <Bar
              dataKey="count"
              name="تعداد رخداد"
              radius={[0, 10, 10, 0]}
              barSize={27}
            >

              {agencyData.map((_, index) => (
                <Cell
                  key={`agency-${index}`}
                  fill={
                    AGENCY_COLORS[
                      index % AGENCY_COLORS.length
                    ]
                  }
                />
              ))}

            </Bar>

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>

  </div>
</div>

                

                    

                  

                

              </PremiumChartCard>

            </div>

          </div>
        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <footer
          className="
            mt-7
            flex
            flex-col
            items-center
            justify-between
            gap-3
            rounded-2xl
            border
            border-slate-200
            bg-white
            px-5
            py-4
            shadow-sm
            sm:flex-row
          "
        >

          <span className="text-xs font-bold text-slate-500">
            GeoVision Command Center
          </span>

          <span className="text-xs font-medium text-slate-400">
            سامانه هوشمند مدیریت رخدادهای شهری
          </span>

        </footer>

      </div>
    </main>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-end gap-5">

      <div className="shrink-0">

        <div className="mb-2 flex items-center gap-2">

          <span className="h-2 w-2 rounded-full bg-blue-600 shadow-md shadow-blue-500/40" />

          <span className="text-[10px] font-black tracking-[0.2em] text-blue-600">
            {eyebrow}
          </span>

        </div>

        <h2 className="text-xl font-black tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs font-medium text-slate-400">
          {description}
        </p>

      </div>

      <div className="mb-2 hidden h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-transparent md:block" />

    </div>
  );
}

/* =========================================================
   INFO PILL
========================================================= */

function InfoPill({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div
      className="
        group
        flex
        items-center
        gap-2.5
        rounded-xl
        border
        border-slate-200
        bg-white
        px-4
        py-2.5
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:border-blue-200
        hover:shadow-md
      "
    >

      <Icon className="h-4 w-4 text-blue-500 transition-transform group-hover:scale-110" />

      <span className="text-[11px] font-bold text-slate-500">
        {text}
      </span>

    </div>
  );
}

/* =========================================================
   PREMIUM STAT CARD
========================================================= */

function PremiumStatCard({
  icon: Icon,
  label,
  value,
  description,
  color,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
  color: string;
  index: string;
}) {
  const themes: Record<
    string,
    {
      iconBg: string;
      iconText: string;
      border: string;
      accent: string;
      number: string;
      glow: string;
    }
  > = {
    blue: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
      border: "border-blue-100",
      accent:
        "from-blue-500 via-blue-600 to-cyan-400",
      number: "text-blue-600",
      glow: "bg-blue-500/10",
    },

    amber: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      border: "border-amber-100",
      accent:
        "from-amber-400 via-amber-500 to-yellow-300",
      number: "text-amber-600",
      glow: "bg-amber-400/10",
    },

    orange: {
      iconBg: "bg-orange-50",
      iconText: "text-orange-600",
      border: "border-orange-100",
      accent:
        "from-orange-400 via-orange-500 to-amber-400",
      number: "text-orange-600",
      glow: "bg-orange-400/10",
    },

    green: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      border: "border-emerald-100",
      accent:
        "from-emerald-400 via-emerald-500 to-cyan-400",
      number: "text-emerald-600",
      glow: "bg-emerald-400/10",
    },
  };

  const theme = themes[color];

  return (
    <div
      className={`
        group
        relative
        min-h-[225px]
        overflow-hidden
        rounded-[26px]
        border
        ${theme.border}
        bg-white
        p-6
        shadow-[0_8px_30px_rgba(15,23,42,0.07)]
        transition-all
        duration-500
        hover:-translate-y-2
        hover:shadow-[0_25px_55px_rgba(15,23,42,0.14)]
      `}
    >

      {/* Top Accent */}

      <div
        className={`
          absolute
          inset-x-0
          top-0
          h-2
          bg-gradient-to-r
          ${theme.accent}
        `}
      />

      {/* Background Glow */}

      <div
        className={`
          pointer-events-none
          absolute
          -left-16
          -top-16
          h-40
          w-40
          rounded-full
          ${theme.glow}
          blur-[60px]
          opacity-60
          transition-all
          duration-500
          group-hover:scale-150
        `}
      />

      {/* Index */}

      <div className="absolute left-5 top-5 text-[10px] font-black tracking-[0.2em] text-slate-200">
        {index}
      </div>

      <div className="relative">

        {/* Icon */}

        <div
          className={`
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            ${theme.iconBg}
            ${theme.iconText}
            shadow-sm
            transition-all
            duration-500
            group-hover:scale-110
            group-hover:-rotate-3
          `}
        >

          <Icon className="h-7 w-7" />

        </div>

        {/* Value */}

        <div className="mt-7 flex items-end gap-2">

          <span
            className="
              text-5xl
              font-black
              leading-none
              tracking-[-0.06em]
              text-slate-950
            "
          >
            {value}
          </span>

          <ArrowUpLeft
            className={`
              mb-1
              h-5
              w-5
              ${theme.number}
              opacity-0
              transition-all
              duration-300
              group-hover:translate-x-1
              group-hover:-translate-y-1
              group-hover:opacity-100
            `}
          />

        </div>

        {/* Label */}

        <div className="mt-5">

          <h3 className="text-base font-black text-slate-900">
            {label}
          </h3>

          <p className="mt-1.5 text-[11px] font-medium text-slate-400">
            {description}
          </p>

        </div>

      </div>

      {/* Bottom Accent */}

      <div
        className={`
          absolute
          bottom-0
          right-0
          h-1
          w-0
          bg-gradient-to-l
          ${theme.accent}
          transition-all
          duration-500
          group-hover:w-full
        `}
      />

    </div>
  );
}

/* =========================================================
   PREMIUM CHART CARD
========================================================= */

function PremiumChartCard({
  title,
  description,
  icon: Icon,
  accent,
  badge,
  large = false,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  badge: string;
  large?: boolean;
  children: React.ReactNode;
}) {
  const accents: Record<
    string,
    {
      iconBg: string;
      iconText: string;
      border: string;
      accent: string;
    }
  > = {
    blue: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
      border: "border-blue-100",
      accent: "from-blue-500 to-cyan-400",
    },

    red: {
      iconBg: "bg-red-50",
      iconText: "text-red-600",
      border: "border-red-100",
      accent: "from-red-500 to-orange-400",
    },

    purple: {
      iconBg: "bg-purple-50",
      iconText: "text-purple-600",
      border: "border-purple-100",
      accent: "from-purple-500 to-blue-400",
    },
  };

  const theme = accents[accent];

  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-slate-200
        bg-white
        shadow-[0_8px_35px_rgba(15,23,42,0.06)]
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-slate-300
        hover:shadow-[0_22px_55px_rgba(15,23,42,0.11)]
      "
    >

      {/* Header */}

      <div
        className="
          relative
          border-b
          border-slate-100
          bg-gradient-to-l
          from-slate-50
          to-white
          px-6
          py-5
        "
      >

        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <div
              className={`
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                ${theme.iconBg}
                ${theme.iconText}
                ${theme.border}
                shadow-sm
                transition-all
                duration-300
                group-hover:scale-105
              `}
            >

              <Icon className="h-6 w-6" />

            </div>

            <div>

              <h3 className="text-base font-black text-slate-900">
                {title}
              </h3>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {description}
              </p>

            </div>

          </div>

          <div
            className="
              hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              py-2
              text-[9px]
              font-black
              tracking-[0.16em]
              text-slate-400
              shadow-sm
              sm:block
            "
          >
            {badge}
          </div>

        </div>

        {/* Header Accent */}

        <div
          className={`
            absolute
            bottom-0
            right-0
            h-[3px]
            w-20
            bg-gradient-to-l
            ${theme.accent}
          `}
        />

      </div>

      {/* Chart Body */}

      <div
        className={`
          relative
          p-5
          md:p-6
          ${large ? "md:p-7" : ""}
        `}
      >
        {children}
      </div>

    </div>
  );
}