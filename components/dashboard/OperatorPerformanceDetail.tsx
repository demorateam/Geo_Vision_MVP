"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  History,
  MapPin,
  Phone,
  Search,
  Timer,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/dashboard/CitizenDashboard";

interface PerformanceIncident {
  id: string;
  incidentNumber: string;
  incidentType: string;
  description: string;
  severity: string;
  status: string;
  operatorStatus: string | null;
  region: string;
  assignedAt: string | Date | null;
  acceptedAt: string | Date | null;
  enRouteAt: string | Date | null;
  arrivedAt: string | Date | null;
  workStartedAt: string | Date | null;
  completedAt: string | Date | null;
  completionNote: string | null;
  createdAt: string | Date;
  agencies: { agencyName: string }[];
}

interface PerformanceOperator {
  id: string;
  name: string;
  phone: string;
  personnelCode: string;
  agency: string;
  status: string;
  vehicle: string | null;
  isActive: boolean;
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
  incidents: PerformanceIncident[];
}

type MissionFilter = "ALL" | "ACTIVE" | "COMPLETED";

const OPERATOR_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "تخصیص داده شده",
  ACCEPTED: "پذیرفته شده",
  EN_ROUTE: "در مسیر",
  ARRIVED: "رسیده به محل",
  WORKING: "در حال رسیدگی",
  COMPLETED: "انجام شده",
};

export function OperatorPerformanceDetail({
  operator,
}: {
  operator: PerformanceOperator;
}) {
  const [filter, setFilter] = useState<MissionFilter>("ALL");
  const [search, setSearch] = useState("");

  const completed = useMemo(
    () => operator.incidents.filter(isCompleted),
    [operator.incidents],
  );
  const active = useMemo(
    () => operator.incidents.filter((incident) => !isCompleted(incident)),
    [operator.incidents],
  );
  const completionDurations = useMemo(
    () =>
      completed
        .map((incident) => durationMs(incident.assignedAt, incident.completedAt))
        .filter((value): value is number => value !== null),
    [completed],
  );
  const acceptanceDurations = useMemo(
    () =>
      operator.incidents
        .map((incident) => durationMs(incident.assignedAt, incident.acceptedAt))
        .filter((value): value is number => value !== null),
    [operator.incidents],
  );
  const successRate = operator.incidents.length
    ? Math.round((completed.length / operator.incidents.length) * 100)
    : 0;

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");
    return operator.incidents.filter((incident) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "COMPLETED" && isCompleted(incident)) ||
        (filter === "ACTIVE" && !isCompleted(incident));
      const matchesSearch =
        !query ||
        incident.incidentNumber.toLocaleLowerCase("fa").includes(query) ||
        incident.incidentType.toLocaleLowerCase("fa").includes(query) ||
        incident.region.toLocaleLowerCase("fa").includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, operator.incidents, search]);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/operators"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" /> بازگشت به مدیریت اپراتورها
      </Link>

      <Card className="overflow-hidden border-blue-100">
        <div className="bg-gradient-to-l from-slate-950 via-blue-950 to-blue-800 p-6 text-white">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <UserRound className="h-8 w-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black">{operator.name}</h1>
                  <Badge className={operator.isActive ? "bg-emerald-500 hover:bg-emerald-500" : "bg-slate-500 hover:bg-slate-500"}>
                    {operator.isActive ? "حساب فعال" : "حساب غیرفعال"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-blue-100">
                  {operator.agency} · کد پرسنلی {operator.personnelCode}
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 md:text-left">
              <a className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2" href={`tel:${operator.phone}`}>
                <Phone className="h-4 w-4" /> {operator.phone}
              </a>
              <span className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <BriefcaseBusiness className="h-4 w-4" />
                {operator.vehicle ?? "وسیله ثبت نشده"}
              </span>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="وضعیت عملیاتی" value={active.length ? "درگیر مأموریت" : "آماده تخصیص"} />
          <InfoItem label="آخرین ورود" value={formatDateTime(operator.lastLoginAt)} />
          <InfoItem label="تاریخ ایجاد حساب" value={formatDate(operator.createdAt)} />
          <InfoItem label="کل سوابق قابل مشاهده" value={`${operator.incidents.length.toLocaleString("fa-IR")} مأموریت`} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={BriefcaseBusiness} label="کل مأموریت‌ها" value={operator.incidents.length.toLocaleString("fa-IR")} note={`${active.length.toLocaleString("fa-IR")} مأموریت فعال`} tone="blue" />
        <MetricCard icon={CheckCircle2} label="مأموریت انجام‌شده" value={completed.length.toLocaleString("fa-IR")} note="سوابق بسته‌شده" tone="emerald" />
        <MetricCard icon={Gauge} label="نرخ اتمام" value={`${successRate.toLocaleString("fa-IR")}٪`} note="انجام‌شده از کل تخصیص‌ها" tone="violet" />
        <MetricCard icon={Timer} label="میانگین زمان انجام" value={formatAverage(completionDurations)} note="از تخصیص تا پایان" tone="amber" />
        <MetricCard icon={Clock3} label="میانگین زمان پذیرش" value={formatAverage(acceptanceDurations)} note="از تخصیص تا پذیرش" tone="slate" />
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-blue-600" /> تاریخچه مأموریت‌ها
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                زمان‌ها فقط بر اساس رویدادهای واقعاً ثبت‌شده در سامانه محاسبه شده‌اند.
              </p>
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="شماره، نوع یا منطقه..." className="h-9 pr-9" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["ALL", "همه", operator.incidents.length],
              ["ACTIVE", "فعال", active.length],
              ["COMPLETED", "انجام‌شده", completed.length],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${filter === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}
              >
                {label} ({count.toLocaleString("fa-IR")})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              سابقه‌ای با این فیلتر پیدا نشد.
            </div>
          ) : (
            <div className="divide-y">
              {filteredIncidents.map((incident) => (
                <MissionHistoryRow key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MissionHistoryRow({ incident }: { incident: PerformanceIncident }) {
  const completed = isCompleted(incident);
  const totalDuration = durationMs(incident.assignedAt, incident.completedAt);
  const workDuration = durationMs(incident.workStartedAt, incident.completedAt);
  const status = completed ? "COMPLETED" : (incident.operatorStatus ?? "ASSIGNED");

  return (
    <article className="p-5 hover:bg-slate-50/70">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold">{incident.incidentNumber}</span>
            <SeverityBadge severity={incident.severity} />
            <Badge variant="outline" className={completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}>
              {OPERATOR_STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
          <h3 className="mt-2 font-bold">{incident.incidentType}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{incident.region}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />تخصیص: {formatDateTime(incident.assignedAt)}</span>
            <span>پایان: {formatDateTime(incident.completedAt)}</span>
          </div>
          {incident.completionNote && (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
              گزارش پایان: {incident.completionNote}
            </p>
          )}
        </div>
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:w-[370px]">
          <DurationBox label="کل زمان مأموریت" value={completed ? formatDuration(totalDuration) : "در حال انجام"} />
          <DurationBox label="زمان عملیات" value={completed ? formatDuration(workDuration) : "—"} />
          <div className="sm:col-span-2">
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <Link href={`/admin/incidents/${incident.id}`}>
                <Eye className="h-4 w-4" /> مشاهده جزئیات رخداد
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value, note, tone }: { icon: typeof Activity; label: string; value: string; note: string; tone: "blue" | "emerald" | "violet" | "amber" | "slate" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-black">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function DurationBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-100 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>;
}

function isCompleted(incident: PerformanceIncident): boolean {
  return incident.operatorStatus === "COMPLETED" || incident.status === "RESOLVED";
}

function durationMs(start: string | Date | null, end: string | Date | null): number | null {
  if (!start || !end) return null;
  const value = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function formatAverage(values: number[]): string {
  if (!values.length) return "داده کافی نیست";
  return formatDuration(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatDuration(value: number | null): string {
  if (value === null) return "ثبت نشده";
  const totalMinutes = Math.max(1, Math.round(value / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days.toLocaleString("fa-IR")} روز`);
  if (hours) parts.push(`${hours.toLocaleString("fa-IR")} ساعت`);
  if (minutes || !parts.length) parts.push(`${minutes.toLocaleString("fa-IR")} دقیقه`);
  return parts.slice(0, 2).join(" و ");
}

function formatDateTime(value: string | Date | null): string {
  return value ? new Date(value).toLocaleString("fa-IR") : "ثبت نشده";
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("fa-IR");
}
