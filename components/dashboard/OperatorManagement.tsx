"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  CircleOff,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SeverityBadge,
  StatusBadge,
} from "@/components/dashboard/CitizenDashboard";

interface AssignedOperator {
  id: string;
  name: string;
  phone: string;
  personnelCode: string;
  agency: string;
  status: string;
  vehicle: string | null;
}

interface IncidentRow {
  id: string;
  incidentNumber: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  region: string;
  imageUrl: string;
  createdAt: string | Date;
  assignedAt: string | Date | null;
  agencies: { agencyName: string }[];
  reporter: { name: string; phone: string };
  assignedOperator: AssignedOperator | null;
}

interface OperatorRow extends AssignedOperator {
  incidents: { id: string; incidentNumber: string; incidentType: string }[];
}

type Filter = "ALL" | "UNASSIGNED" | "ASSIGNED";

export function OperatorManagement({
  incidents,
  operators,
}: {
  incidents: IncidentRow[];
  operators: OperatorRow[];
}) {
  const [incidentRows, setIncidentRows] = useState(incidents);
  const [operatorRows, setOperatorRows] = useState(operators);
  const [selectedId, setSelectedId] = useState(incidents[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [updatingOperatorId, setUpdatingOperatorId] = useState<string | null>(
    null,
  );

  const selected =
    incidentRows.find((incident) => incident.id === selectedId) ?? null;

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return incidentRows.filter((incident) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNASSIGNED" && !incident.assignedOperator) ||
        (filter === "ASSIGNED" && Boolean(incident.assignedOperator));
      const matchesSearch =
        !query ||
        incident.incidentNumber.toLowerCase().includes(query) ||
        incident.incidentType.toLowerCase().includes(query) ||
        incident.region.toLowerCase().includes(query) ||
        incident.assignedOperator?.name.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, incidentRows, search]);

  const candidateOperators = useMemo(() => {
    if (!selected) return [];
    const agencies = new Set(
      selected.agencies.map((agency) => agency.agencyName),
    );
    return operatorRows
      .filter((operator) => agencies.has(operator.agency))
      .sort((first, second) => {
        const firstBusy = first.incidents.some(
          (incident) => incident.id !== selected.id,
        );
        const secondBusy = second.incidents.some(
          (incident) => incident.id !== selected.id,
        );
        return (
          Number(firstBusy) - Number(secondBusy) ||
          first.name.localeCompare(second.name, "fa")
        );
      });
  }, [operatorRows, selected]);

  const stats = useMemo(() => {
    const unassigned = incidentRows.filter(
      (incident) =>
        incident.status !== "RESOLVED" && !incident.assignedOperator,
    ).length;
    const busy = operatorRows.filter(
      (operator) => operator.incidents.length > 0,
    ).length;
    const available = operatorRows.filter(
      (operator) =>
        operator.status === "AVAILABLE" && operator.incidents.length === 0,
    ).length;
    return { unassigned, busy, available, total: operatorRows.length };
  }, [incidentRows, operatorRows]);

  const assignOperator = async (operator: AssignedOperator | null) => {
    if (!selected) return;

    const message = operator
      ? `اپراتور «${operator.name}» به رخداد ${selected.incidentNumber} تخصیص داده شود؟`
      : `تخصیص اپراتور از رخداد ${selected.incidentNumber} لغو شود؟`;
    if (!window.confirm(message)) return;

    setUpdatingOperatorId(operator?.id ?? "UNASSIGN");
    try {
      const response = await fetch(`/api/incidents/${selected.id}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId: operator?.id ?? null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const previousOperatorId = selected.assignedOperator?.id ?? null;
      setIncidentRows((current) =>
        current.map((incident) =>
          incident.id === selected.id
            ? {
                ...incident,
                assignedOperator: data.assignedOperator,
                assignedAt: data.assignedAt,
              }
            : incident,
        ),
      );
      setOperatorRows((current) =>
        current.map((item) => {
          const withoutCurrent = item.incidents.filter(
            (incident) => incident.id !== selected.id,
          );
          if (item.id === operator?.id) {
            return {
              ...item,
              incidents: [
                ...withoutCurrent,
                {
                  id: selected.id,
                  incidentNumber: selected.incidentNumber,
                  incidentType: selected.incidentType,
                },
              ],
            };
          }
          if (item.id === previousOperatorId)
            return { ...item, incidents: withoutCurrent };
          return item;
        }),
      );
      toast.success(
        operator ? "اپراتور با موفقیت تخصیص داده شد" : "تخصیص اپراتور لغو شد",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت تخصیص");
    } finally {
      setUpdatingOperatorId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">مدیریت اپراتورها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هر رخداد را بررسی کنید و اپراتور مناسب همان سازمان را تخصیص دهید.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleOff}
          label="رخداد بدون اپراتور"
          value={stats.unassigned}
          tone="amber"
        />
        <StatCard
          icon={UserRoundCheck}
          label="اپراتور آماده"
          value={stats.available}
          tone="emerald"
        />
        <StatCard
          icon={Clock3}
          label="اپراتور مشغول"
          value={stats.busy}
          tone="blue"
        />
        <StatCard
          icon={UsersRound}
          label="کل اپراتورها"
          value={stats.total}
          tone="slate"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-blue-600" /> کارنامه اپراتورها
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              برای مشاهده KPI، زمان انجام کار و سوابق هر اپراتور وارد کارنامه او شوید.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {operatorRows.map((operator) => {
              const activeMission = operator.incidents[0];
              return (
                <div
                  key={operator.id}
                  className="w-64 shrink-0 rounded-xl border bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{operator.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {operator.personnelCode} · {operator.agency}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        activeMission
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      {activeMission ? "مشغول" : "آماده"}
                    </Badge>
                  </div>
                  <p className="mt-3 truncate text-xs text-slate-500">
                    {activeMission
                      ? `مأموریت ${activeMission.incidentNumber}`
                      : operator.vehicle ?? "بدون مأموریت فعال"}
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full gap-2">
                    <Link href={`/admin/operators/${operator.id}`}>
                      <Activity className="h-4 w-4" /> مشاهده کارنامه
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-3 border-b bg-slate-50/70">
            <CardTitle className="text-base">فهرست رخدادها</CardTitle>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شماره، نوع، منطقه یا اپراتور..."
                className="h-9 pr-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              {(
                [
                  ["ALL", "همه"],
                  ["UNASSIGNED", "بدون مأمور"],
                  ["ASSIGNED", "تخصیص‌شده"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-2 py-2 transition ${
                    filter === value
                      ? "bg-white font-medium text-blue-700 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-[620px] space-y-2 overflow-y-auto p-2">
            {filteredIncidents.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                رخدادی یافت نشد
              </p>
            ) : (
              filteredIncidents.map((incident) => (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => setSelectedId(incident.id)}
                  className={`w-full rounded-xl border p-3 text-right transition ${
                    selectedId === incident.id
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold">
                        {incident.incidentNumber}
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {incident.incidentType}
                      </p>
                    </div>
                    <ChevronLeft className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{incident.region}</span>
                    <span>
                      {new Date(incident.createdAt).toLocaleDateString("fa-IR")}
                    </span>
                  </div>
                  <div className="mt-2">
                    {incident.assignedOperator ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                        <UserRoundCheck className="h-3 w-3" />
                        {incident.assignedOperator.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                        <CircleOff className="h-3 w-3" /> تخصیص داده نشده
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {!selected ? (
          <Card className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              برای بررسی، یک رخداد را انتخاب کنید.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                <img
                  src={selected.imageUrl}
                  alt="تصویر رخداد"
                  className="h-48 w-full object-cover md:h-full"
                />
                <div className="p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-mono text-sm font-bold">
                        {selected.incidentNumber}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        {selected.incidentType}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <SeverityBadge severity={selected.severity} />
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {selected.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selected.region}
                    </span>
                    <span>گزارش‌دهنده: {selected.reporter.name}</span>
                    {selected.agencies.map((agency) => (
                      <Badge key={agency.agencyName} variant="outline">
                        {agency.agencyName}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-2"
                  >
                    <Link href={`/admin/incidents/${selected.id}`}>
                      <Eye className="h-4 w-4" /> مشاهده جزئیات کامل
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              className={
                selected.assignedOperator
                  ? "border-emerald-200"
                  : "border-amber-200"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-blue-600" /> تخصیص فعلی
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selected.assignedOperator ? (
                  <div className="flex flex-col justify-between gap-4 rounded-xl bg-emerald-50/70 p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-bold text-emerald-950">
                        {selected.assignedOperator.name}
                      </p>
                      <p className="mt-1 text-xs text-emerald-800">
                        {selected.assignedOperator.personnelCode} ·{" "}
                        {selected.assignedOperator.agency}
                        {selected.assignedOperator.vehicle
                          ? ` · ${selected.assignedOperator.vehicle}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/operators/${selected.assignedOperator.id}`}>
                          <Activity className="ml-1 h-4 w-4" />
                          کارنامه
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${selected.assignedOperator.phone}`}>
                          <Phone className="ml-1 h-4 w-4" />
                          تماس
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => assignOperator(null)}
                        disabled={updatingOperatorId !== null}
                      >
                        {updatingOperatorId === "UNASSIGN" && (
                          <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                        )}
                        لغو تخصیص
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                    هنوز اپراتوری برای این رخداد انتخاب نشده است.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  اپراتورهای پیشنهادی سازمان‌های مسئول
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {candidateOperators.length === 0 ? (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    برای سازمان‌های این رخداد اپراتوری ثبت نشده است.
                  </p>
                ) : (
                  candidateOperators.map((operator) => {
                    const isCurrent =
                      selected.assignedOperator?.id === operator.id;
                    const otherAssignment = operator.incidents.find(
                      (incident) => incident.id !== selected.id,
                    );
                    const unavailable =
                      operator.status !== "AVAILABLE" ||
                      Boolean(otherAssignment);
                    return (
                      <div
                        key={operator.id}
                        className={`rounded-xl border p-4 ${isCurrent ? "border-blue-300 bg-blue-50/50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{operator.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {operator.personnelCode} · {operator.agency}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              isCurrent
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : unavailable
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }
                          >
                            {isCurrent
                              ? "اپراتور فعلی"
                              : unavailable
                                ? "مشغول"
                                : "آماده"}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs text-slate-600">
                          {operator.vehicle ?? "وسیله عملیاتی ثبت نشده"}
                        </p>
                        {otherAssignment && (
                          <p className="mt-2 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
                            مأموریت فعال: {otherAssignment.incidentNumber} ـ{" "}
                            {otherAssignment.incidentType}
                          </p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/operators/${operator.id}`}>
                              <Activity className="ml-1 h-4 w-4" /> کارنامه
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant={isCurrent ? "outline" : "default"}
                            disabled={
                              isCurrent ||
                              unavailable ||
                              updatingOperatorId !== null
                            }
                            onClick={() => assignOperator(operator)}
                          >
                            {updatingOperatorId === operator.id && (
                              <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                            )}
                            {isCurrent ? "تخصیص شده" : "تخصیص"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "amber" | "emerald" | "blue" | "slate";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
