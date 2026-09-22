"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  MapPin,
  Navigation,
  Phone,
  Play,
  Route,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/dashboard/CitizenDashboard";

const LocationMap = dynamic(
  () => import("@/components/map/LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        در حال بارگذاری نقشه...
      </div>
    ),
  },
);

const FLOW = [
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "WORKING",
  "COMPLETED",
] as const;
const LABELS: Record<string, string> = {
  ASSIGNED: "تخصیص مأموریت",
  ACCEPTED: "پذیرش مأموریت",
  EN_ROUTE: "حرکت به محل",
  ARRIVED: "رسیدن به محل",
  WORKING: "شروع رسیدگی",
  COMPLETED: "پایان مأموریت",
};
const ACTIONS: Record<string, { next: string; label: string; help: string }> = {
  ASSIGNED: {
    next: "ACCEPTED",
    label: "پذیرش مأموریت",
    help: "با پذیرش، مدیر از شروع پیگیری مطلع می‌شود.",
  },
  ACCEPTED: {
    next: "EN_ROUTE",
    label: "شروع حرکت به محل",
    help: "پس از حرکت، وضعیت شما «در مسیر» ثبت می‌شود.",
  },
  EN_ROUTE: {
    next: "ARRIVED",
    label: "به محل رسیدم",
    help: "این گزینه را پس از رسیدن به نشانی رخداد بزنید.",
  },
  ARRIVED: {
    next: "WORKING",
    label: "شروع رسیدگی",
    help: "زمان آغاز عملیات برای محاسبه عملکرد ثبت می‌شود.",
  },
  WORKING: {
    next: "COMPLETED",
    label: "ثبت پایان مأموریت",
    help: "گزارش کوتاه انجام کار را وارد و مأموریت را ببندید.",
  },
};

interface MissionDetail {
  id: string;
  incidentNumber: string;
  incidentType: string;
  description: string;
  severity: string;
  status: string;
  operatorStatus: string | null;
  region: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address: string | null;
  createdAt: string | Date;
  assignedAt: string | Date | null;
  acceptedAt: string | Date | null;
  enRouteAt: string | Date | null;
  arrivedAt: string | Date | null;
  workStartedAt: string | Date | null;
  completedAt: string | Date | null;
  completionNote: string | null;
  reporter: { name: string; phone: string };
  agencies: { agencyName: string }[];
}

export function OperatorMissionDetail({
  incident,
}: {
  incident: MissionDetail;
}) {
  const router = useRouter();
  const [state, setState] = useState(
    incident.status === "RESOLVED"
      ? "COMPLETED"
      : (incident.operatorStatus ?? "ASSIGNED"),
  );
  const [completionNote, setCompletionNote] = useState(
    incident.completionNote ?? "",
  );
  const [updating, setUpdating] = useState(false);
  const [routing, setRouting] = useState(false);
  const action = ACTIONS[state];
  const isCompleted = state === "COMPLETED";
  const currentIndex = FLOW.indexOf(state as (typeof FLOW)[number]);

  const updateMission = async () => {
    if (!action) return;
    if (action.next === "COMPLETED" && completionNote.trim().length < 3) {
      toast.error("لطفاً گزارش کوتاهی از کار انجام‌شده بنویسید");
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/operator/missions/${incident.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action.next, completionNote }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState(action.next);
      toast.success(
        action.next === "COMPLETED"
          ? "مأموریت با موفقیت پایان یافت"
          : "وضعیت مأموریت ثبت شد",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ثبت وضعیت ناموفق بود",
      );
    } finally {
      setUpdating(false);
    }
  };

  const routeWithNeshan = () => {
    if (isCompleted) return;
    if (!navigator.geolocation)
      return toast.error("مرورگر شما از GPS پشتیبانی نمی‌کند");
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        const destination = `${incident.latitude},${incident.longitude}`;
        window.open(
          `https://nshn.ir?origin=${origin}&destination=${destination}&vehicle=d`,
          "_blank",
          "noopener,noreferrer",
        );
        setRouting(false);
      },
      () => {
        toast.error("دسترسی به موقعیت فعلی امکان‌پذیر نیست");
        setRouting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-5">
      <Link
        href="/operator#missions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowRight className="h-4 w-4" /> بازگشت به مأموریت‌ها
      </Link>

      {isCompleted && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-bold">این مأموریت بسته شده است</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              جزئیات برای مشاهده سوابق در دسترس است؛ مسیریابی و تغییر مراحل
              مأموریت دیگر امکان‌پذیر نیست.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="relative">
              <img
                src={incident.imageUrl}
                alt="تصویر رخداد"
                className="h-56 w-full object-cover sm:h-72"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16 text-white">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-white/70">
                      {incident.incidentNumber}
                    </p>
                    <h1 className="mt-1 text-2xl font-black">
                      {incident.incidentType}
                    </h1>
                  </div>
                  <SeverityBadge severity={incident.severity} />
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {incident.region}
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  {new Date(incident.createdAt).toLocaleString("fa-IR")}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">
                  شرح رخداد
                </p>
                <p className="leading-8">{incident.description}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {incident.agencies.map((item) => (
                  <Badge key={item.agencyName} variant="outline">
                    {item.agencyName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-red-500" />
                موقعیت رخداد
              </CardTitle>
              <Button
                size="sm"
                variant={isCompleted ? "outline" : "default"}
                onClick={routeWithNeshan}
                disabled={routing || isCompleted}
              >
                {isCompleted ? (
                  <LockKeyhole className="ml-1 h-4 w-4" />
                ) : routing ? (
                  <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="ml-1 h-4 w-4" />
                )}
                {isCompleted ? "مسیریابی غیرفعال" : "مسیریابی نشان"}
              </Button>
            </CardHeader>
            <CardContent>
              <LocationMap
                center={{ lat: incident.latitude, lng: incident.longitude }}
                height="280px"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">
                موقعیت رخداد: {incident.address ?? `${incident.latitude.toFixed(6)}، ${incident.longitude.toFixed(6)}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-blue-600" />
                اطلاعات تماس گزارش‌دهنده
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">{incident.reporter.name}</p>
                <p className="text-sm text-slate-500">
                  در صورت نیاز برای یافتن دقیق محل تماس بگیرید.
                </p>
              </div>
              <Button asChild variant="outline">
                <a href={`tel:${incident.reporter.phone}`}>
                  <Phone className="ml-2 h-4 w-4" />
                  {incident.reporter.phone}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="border-blue-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Route className="h-5 w-5 text-blue-600" />
                روند مأموریت
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {FLOW.map((step, index) => {
                const done = index <= currentIndex;
                const current = index === currentIndex;
                return (
                  <div
                    key={step}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {index < FLOW.length - 1 && (
                      <span
                        className={`absolute right-[13px] top-7 h-[calc(100%-20px)] w-0.5 ${index < currentIndex ? "bg-emerald-400" : "bg-slate-200"}`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-300"}`}
                    >
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${current ? "text-blue-700" : done ? "text-slate-800" : "text-slate-400"}`}
                      >
                        {LABELS[step]}
                      </p>
                      {current && (
                        <p className="mt-0.5 text-xs text-blue-600">
                          مرحله فعلی
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {state === "COMPLETED" ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h2 className="mt-3 font-black text-emerald-900">
                  مأموریت انجام شد
                </h2>
                {completionNote && (
                  <p className="mt-2 rounded-xl bg-white/70 p-3 text-right text-sm leading-6 text-emerald-900">
                    {completionNote}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-blue-200">
              <div className="bg-blue-600 px-5 py-4 text-white">
                <p className="text-xs text-blue-100">اقدام بعدی</p>
                <h2 className="mt-1 font-black">{action?.label}</h2>
              </div>
              <CardContent className="space-y-4 p-5">
                <p className="text-sm leading-6 text-slate-600">
                  {action?.help}
                </p>
                {action?.next === "COMPLETED" && (
                  <div>
                    <label
                      htmlFor="completion-note"
                      className="mb-2 block text-sm font-semibold"
                    >
                      گزارش انجام کار
                    </label>
                    <textarea
                      id="completion-note"
                      value={completionNote}
                      onChange={(event) =>
                        setCompletionNote(event.target.value)
                      }
                      maxLength={500}
                      rows={4}
                      placeholder="مثلاً: محل ایمن‌سازی و مشکل برطرف شد..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-1 text-left text-[11px] text-slate-400">
                      {completionNote.length.toLocaleString("fa-IR")}/۵۰۰
                    </p>
                  </div>
                )}
                <Button
                  onClick={updateMission}
                  disabled={updating}
                  className="w-full"
                  size="lg"
                >
                  {updating ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : action?.next === "COMPLETED" ? (
                    <ShieldCheck className="ml-2 h-4 w-4" />
                  ) : (
                    <Play className="ml-2 h-4 w-4" />
                  )}
                  {action?.label}
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
