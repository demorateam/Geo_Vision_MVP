"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  Navigation,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/dashboard/CitizenDashboard";

interface Mission {
  id: string;
  incidentNumber: string;
  incidentType: string;
  description: string;
  severity: string;
  status: string;
  operatorStatus: string | null;
  region: string;
  imageUrl: string;
  assignedAt: string | Date | null;
  acceptedAt: string | Date | null;
  completedAt: string | Date | null;
}

const OPERATOR_LABELS: Record<string, string> = {
  ASSIGNED: "جدید",
  ACCEPTED: "پذیرفته شده",
  EN_ROUTE: "در مسیر",
  ARRIVED: "در محل",
  WORKING: "در حال رسیدگی",
  COMPLETED: "انجام شده",
};

export function OperatorDashboard({
  operator,
  incidents,
}: {
  operator: { name: string; agency: string };
  incidents: Mission[];
}) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const active = incidents.filter(
    (item) => item.operatorStatus !== "COMPLETED" && item.status !== "RESOLVED",
  );
  const completed = incidents.filter(
    (item) => item.operatorStatus === "COMPLETED" || item.status === "RESOLVED",
  );
  const today = new Date().toDateString();
  const completedToday = completed.filter(
    (item) =>
      item.completedAt && new Date(item.completedAt).toDateString() === today,
  ).length;
  const responseSamples = incidents
    .filter((item) => item.assignedAt && item.acceptedAt)
    .map(
      (item) =>
        (new Date(item.acceptedAt!).getTime() -
          new Date(item.assignedAt!).getTime()) /
        60000,
    );
  const averageResponse = responseSamples.length
    ? Math.round(
        responseSamples.reduce((a, b) => a + b, 0) / responseSamples.length,
      )
    : null;
  const successRate = incidents.length
    ? Math.round((completed.length / incidents.length) * 100)
    : 0;
  const visible = tab === "active" ? active : completed;

  const shiftProgress = useMemo(() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return Math.max(
      0,
      Math.min(100, Math.round(((minutes - 8 * 60) / (8 * 60)) * 100)),
    );
  }, []);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-600 p-5 text-white shadow-lg shadow-blue-200/50 md:p-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-1 text-sm text-blue-100">
              سلام {operator.name}، وقت بخیر
            </p>
            <h1 className="text-2xl font-black md:text-3xl">
              مرکز مأموریت‌های من
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              مأموریت بعدی را ببینید، مسیر را شروع کنید و گزارش انجام کار را
              همان‌جا ثبت کنید.
            </p>
          </div>
          <div className="min-w-56 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span>شیفت امروز ۸ تا ۱۶</span>
              <span>{shiftProgress.toLocaleString("fa-IR")}٪</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${shiftProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-blue-100">واحد {operator.agency}</p>
          </div>
        </div>
      </section>

      <section
        id="performance"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Kpi
          icon={Navigation}
          label="مأموریت فعال"
          value={active.length.toLocaleString("fa-IR")}
          color="blue"
        />
        <Kpi
          icon={CheckCircle2}
          label="انجام‌شده امروز"
          value={completedToday.toLocaleString("fa-IR")}
          color="emerald"
        />
        <Kpi
          icon={TimerReset}
          label="میانگین پذیرش"
          value={
            averageResponse === null
              ? "—"
              : `${averageResponse.toLocaleString("fa-IR")} دقیقه`
          }
          color="violet"
        />
        <Kpi
          icon={Target}
          label="نرخ موفقیت"
          value={`${successRate.toLocaleString("fa-IR")}٪`}
          color="amber"
        />
      </section>

      {active[0] && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold">اولویت فعلی</h2>
          </div>
          <Link href={`/operator/missions/${active[0].id}`} className="block">
            <Card className="overflow-hidden border-blue-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="grid gap-0 p-0 sm:grid-cols-[180px_1fr]">
                <img
                  src={active[0].imageUrl}
                  alt="تصویر رخداد"
                  className="h-40 w-full object-cover sm:h-full"
                />
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-slate-500">
                        {active[0].incidentNumber}
                      </p>
                      <h3 className="mt-1 text-lg font-black">
                        {active[0].incidentType}
                      </h3>
                    </div>
                    <SeverityBadge severity={active[0].severity} />
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                    {active[0].description}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-4 w-4" />
                      {active[0].region}
                    </span>
                    <Button size="sm">
                      مشاهده و شروع <ChevronLeft className="mr-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}

      <section id="missions" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black">فهرست مأموریت‌ها</h2>
            <p className="text-sm text-slate-500">
              فقط رخدادهای تخصیص‌یافته به شما نمایش داده می‌شوند.
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 text-sm">
            <button
              onClick={() => setTab("active")}
              className={`rounded-lg px-4 py-2 ${tab === "active" ? "bg-white font-semibold text-blue-700 shadow-sm" : "text-slate-600"}`}
            >
              فعال ({active.length.toLocaleString("fa-IR")})
            </button>
            <button
              onClick={() => setTab("completed")}
              className={`rounded-lg px-4 py-2 ${tab === "completed" ? "bg-white font-semibold text-blue-700 shadow-sm" : "text-slate-600"}`}
            >
              انجام‌شده ({completed.length.toLocaleString("fa-IR")})
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white px-5 py-14 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <h3 className="font-bold">
              {tab === "active"
                ? "مأموریت فعالی ندارید"
                : "هنوز مأموریتی تکمیل نشده"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {tab === "active"
                ? "در حال حاضر صف کاری شما خالی است."
                : "سوابق تکمیل‌شده اینجا نمایش داده می‌شوند."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const state =
    mission.status === "RESOLVED"
      ? "COMPLETED"
      : (mission.operatorStatus ?? "ASSIGNED");
  return (
    <Link
      href={`/operator/missions/${mission.id}`}
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-slate-500">
            {mission.incidentNumber}
          </p>
          <h3 className="mt-1 font-bold">{mission.incidentType}</h3>
        </div>
        <Badge
          variant="outline"
          className={
            state === "COMPLETED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }
        >
          {OPERATOR_LABELS[state] ?? "تخصیص یافته"}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
        {mission.description}
      </p>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {mission.region}
        </span>
        <span className="flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {new Date(mission.assignedAt ?? Date.now()).toLocaleDateString(
            "fa-IR",
          )}
        </span>
        <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Navigation;
  label: string;
  value: string;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div
          className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
