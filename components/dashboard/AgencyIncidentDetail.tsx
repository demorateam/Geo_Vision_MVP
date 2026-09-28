"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Route,
  User,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StatusBadge,
  SeverityBadge,
} from "@/components/dashboard/CitizenDashboard";
import { STATUS_LABELS } from "@/types";

const LocationMap = dynamic(
  () => import("@/components/map/LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground">
        در حال بارگذاری نقشه...
      </div>
    ),
  },
);

interface StatusHistoryEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  createdAt: string | Date;
}

interface IncidentDetail {
  id: string;
  incidentNumber: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  region: string;
  aiSummary: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  imageUrl: string;
  createdAt: string | Date;
  agencies: { agencyName: string }[];
  reporter: { name: string; phone: string };
  statusHistory: StatusHistoryEntry[];
  assignedOperator: {
    id: string;
    name: string;
    phone: string;
    personnelCode: string;
    agency: string;
    status: string;
    vehicle: string | null;
  } | null;
  assignedAt: string | Date | null;
  operatorStatus: string | null;
}

type AssignmentState =
  "ASSIGNED" | "ACCEPTED" | "EN_ROUTE" | "ON_SITE" | "WORKING" | "COMPLETED";

const ASSIGNMENT_LABELS: Record<AssignmentState, string> = {
  ASSIGNED: "مأمور تعیین شده",
  ACCEPTED: "مأموریت پذیرفته شده",
  EN_ROUTE: "در مسیر محل رخداد",
  ON_SITE: "به محل رسیده",
  WORKING: "در حال رسیدگی",
  COMPLETED: "مأموریت پایان یافته",
};

const ASSIGNMENT_STYLES: Record<AssignmentState, string> = {
  ASSIGNED: "border-slate-200 bg-slate-50 text-slate-700",
  ACCEPTED: "border-cyan-200 bg-cyan-50 text-cyan-700",
  EN_ROUTE: "border-blue-200 bg-blue-50 text-blue-700",
  ON_SITE: "border-violet-200 bg-violet-50 text-violet-700",
  WORKING: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function hashText(value: string) {
  return Array.from(value).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

function haversineDistanceKm(
  first: { lat: number; lng: number },
  second: { lat: number; lng: number },
) {
  const earthRadiusKm = 6371;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.lat)) *
      Math.cos(toRadians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assignmentStateFor(
  progress: number,
  incidentStatus: string,
  operatorStatus: string | null,
): AssignmentState {
  if (incidentStatus === "RESOLVED" || progress >= 1) return "COMPLETED";
  if (operatorStatus === "COMPLETED") return "COMPLETED";
  if (operatorStatus === "WORKING") return "WORKING";
  if (operatorStatus === "ARRIVED") return "ON_SITE";
  if (operatorStatus === "EN_ROUTE") return "EN_ROUTE";
  if (operatorStatus === "ACCEPTED") return "ACCEPTED";
  if (operatorStatus === "ASSIGNED") return "ASSIGNED";
  if (incidentStatus === "PENDING" && progress < 0.08) return "ASSIGNED";
  if (progress < 0.78) return "EN_ROUTE";
  if (progress < 0.9) return "ON_SITE";
  return "WORKING";
}

interface AgencyIncidentDetailProps {
  incident: IncidentDetail;
  backHref?: string;
  backLabel?: string;
  showRouting?: boolean;
  // "admin": بازطراحی UI مخصوص پنل مدیریتی (فقط UI/Layout؛ endpoint‌ها و منطق فرقی نمی‌کنند).
  // پیش‌فرض "default" است تا رفتار فعلی صفحه agency و هر جای دیگری که این prop را پاس نمی‌دهد، دقیقاً بدون تغییر بماند.
  variant?: "default" | "admin";
}

export function AgencyIncidentDetail({
  incident,
  backHref = "/agency/incidents",
  backLabel = "بازگشت به فهرست رخدادها",
  showRouting = true,
  variant = "default",
}: AgencyIncidentDetailProps) {
  const isAdmin = variant === "admin";
  const [status, setStatus] = useState(incident.status);
  const [updating, setUpdating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [assignedOperator, setAssignedOperator] = useState(
    incident.assignedOperator,
  );
  const [operatorStatus, setOperatorStatus] = useState(incident.operatorStatus);
  const [trackingActive, setTrackingActive] = useState(
    Boolean(incident.assignedOperator) &&
      incident.operatorStatus === "EN_ROUTE",
  );
  const [routeProgress, setRouteProgress] = useState(
    !incident.assignedOperator
      ? 0
      : incident.status === "RESOLVED" ||
          incident.operatorStatus === "COMPLETED"
        ? 1
        : incident.operatorStatus === "ARRIVED" ||
            incident.operatorStatus === "WORKING"
          ? 0.94
          : incident.operatorStatus === "EN_ROUTE"
            ? 0.34
            : 0.04,
  );
    const [lastLocationUpdate, setLastLocationUpdate] = useState(new Date());
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const startPosition = useMemo(() => {
    const seed = hashText(incident.id);
    const latitudeDirection = seed % 2 === 0 ? 1 : -1;
    const longitudeDirection = seed % 3 === 0 ? 1 : -1;
    return {
      lat: incident.latitude + latitudeDirection * (0.008 + (seed % 5) * 0.001),
      lng:
        incident.longitude + longitudeDirection * (0.009 + (seed % 4) * 0.001),
    };
  }, [incident.id, incident.latitude, incident.longitude]);

  const agentPosition = useMemo(
    () => ({
      lat:
        startPosition.lat +
        (incident.latitude - startPosition.lat) * routeProgress,
      lng:
        startPosition.lng +
        (incident.longitude - startPosition.lng) * routeProgress,
    }),
    [incident.latitude, incident.longitude, routeProgress, startPosition],
  );

  const distanceKm = haversineDistanceKm(agentPosition, {
    lat: incident.latitude,
    lng: incident.longitude,
  });
  const estimatedMinutes =
    routeProgress >= 0.9 ? 0 : Math.max(1, Math.ceil((distanceKm / 28) * 60));
  const assignmentState = assignmentStateFor(
    routeProgress,
    status,
    operatorStatus,
  );

  useEffect(() => {
    if (
      !assignedOperator ||
      !trackingActive ||
      status === "RESOLVED" ||
      routeProgress >= 0.94
    )
      return;
    const timer = window.setInterval(() => {
      setRouteProgress((current) => Math.min(0.94, current + 0.025));
      setLastLocationUpdate(new Date());
    }, 3000);
    return () => window.clearInterval(timer);
  }, [assignedOperator, trackingActive, routeProgress, status]);

  useEffect(() => {
    const syncAssignment = async () => {
      try {
        const response = await fetch(`/api/incidents/${incident.id}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const nextOperator = data.incident?.assignedOperator ?? null;
        const nextOperatorStatus = data.incident?.operatorStatus ?? null;
        setOperatorStatus(nextOperatorStatus);
        if (data.incident?.status) setStatus(data.incident.status);
        setAssignedOperator((current) => {
          if (!current && nextOperator && status !== "RESOLVED") {
            setRouteProgress(0.04);
            setTrackingActive(true);
          }
          return nextOperator;
        });
        if (!nextOperator) {
          setTrackingActive(false);
          setRouteProgress(0);
        } else if (nextOperatorStatus === "COMPLETED") {
          setTrackingActive(false);
          setRouteProgress(1);
        } else if (
          nextOperatorStatus === "WORKING" ||
          nextOperatorStatus === "ARRIVED"
        ) {
          setTrackingActive(false);
          setRouteProgress(0.94);
        } else if (nextOperatorStatus === "EN_ROUTE") {
          setTrackingActive(true);
          setRouteProgress((current) => Math.max(current, 0.18));
        }
      } catch {
        // A temporary polling error should not interrupt the detail page.
      }
    };

    const timer = window.setInterval(syncAssignment, 10000);
    return () => window.clearInterval(timer);
  }, [incident.id, status]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus(newStatus);
      if (newStatus === "PENDING") {
        setRouteProgress(0.04);
        setTrackingActive(false);
      } else if (newStatus === "IN_PROGRESS") {
        setRouteProgress((current) => Math.max(current, 0.12));
        setTrackingActive(Boolean(assignedOperator));
      } else if (newStatus === "RESOLVED") {
        setRouteProgress(1);
        setTrackingActive(false);
      }
      setLastLocationUpdate(new Date());
      toast.success("وضعیت به‌روزرسانی شد");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "خطا در به‌روزرسانی",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleRouting = () => {
    if (!navigator.geolocation) {
      toast.error("مرورگر شما از GPS پشتیبانی نمی‌کند");
      return;
    }

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
        toast.error("دریافت موقعیت فعلی ناموفق بود. دسترسی GPS را بررسی کنید");
        setRouting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const statusLabels = STATUS_LABELS as Record<string, string>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-mono text-xl font-bold">
            {incident.incidentNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(incident.createdAt).toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={status} />
        </div>
      </div>

      {isAdmin ? (
        <>
          {/* باکس یکپارچه تصویر + جزئیات رخداد (فقط پنل مدیریتی) */}
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div
                className="h-64 w-full cursor-zoom-in md:h-auto"
                onClick={() => setImagePreviewOpen(true)}
              >
                <img
                  src={incident.imageUrl}
                  alt="تصویر رخداد"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-4 border-t border-slate-100 p-5 md:border-t-0 md:border-r md:p-6">
                <h2 className="text-base font-bold text-slate-900">
                  جزئیات رخداد
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="نوع رخداد" value={incident.incidentType} />
                  <InfoRow label="منطقه" value={incident.region} />
                </div>
                {incident.aiSummary && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                    <p className="mb-1 text-xs font-medium text-blue-700">
                      خلاصه هوش مصنوعی
                    </p>
                    <p className="text-sm text-slate-700">
                      {incident.aiSummary}
                    </p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    سازمان‌های مسئول
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {incident.agencies.map((agency) => (
                      <Badge key={agency.agencyName} variant="outline">
                        {agency.agencyName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* گزارش‌دهنده + توضیحات کاربر در یک باکس خاکستری کمرنگ */}
          <Card className="border-slate-100 bg-slate-50/70">
            <CardHeader>
              <CardTitle className="text-base">گزارش‌دهنده</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">نام گزارش‌دهنده:</span>
                <span className="font-medium text-slate-900">
                  {incident.reporter.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">شماره تماس:</span>
                <span className="font-medium text-slate-900">
                  {incident.reporter.phone}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  توضیحات کاربر
                </p>
                <p className="text-sm leading-7 text-slate-700">
                  {incident.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="overflow-hidden">
            <img
              src={incident.imageUrl}
              alt="تصویر رخداد"
              className="h-64 w-full object-cover md:h-80"
            />
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">جزئیات رخداد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="نوع رخداد" value={incident.incidentType} />
                  <InfoRow label="منطقه" value={incident.region} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    توضیحات گزارش‌دهنده
                  </p>
                  <p className="text-sm leading-7">{incident.description}</p>
                </div>
                {incident.aiSummary && (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      خلاصه هوش مصنوعی
                    </p>
                    <p className="text-sm">{incident.aiSummary}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    سازمان‌های مسئول
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {incident.agencies.map((agency) => (
                      <Badge key={agency.agencyName} variant="outline">
                        {agency.agencyName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">گزارش‌دهنده</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {incident.reporter.name}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {incident.reporter.phone}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRoundCheck className="h-5 w-5 text-blue-600" />
            مأمور مسئول و ردیابی عملیات
          </CardTitle>
          {assignedOperator ? (
            <Badge
              variant="outline"
              className={ASSIGNMENT_STYLES[assignmentState]}
            >
              <Radio
                className={`ml-1 h-3 w-3 ${trackingActive ? "animate-pulse" : ""}`}
              />
              {ASSIGNMENT_LABELS[assignmentState]}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700"
            >
              اپراتوری تخصیص داده نشده
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!assignedOperator ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              این رخداد هنوز به اپراتوری سپرده نشده است. مدیر سیستم می‌تواند از
              بخش «مدیریت اپراتورها» مأمور مناسب را انتخاب کند.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TrackingInfo label="نام مأمور" value={assignedOperator.name} />
                <TrackingInfo
                  label="کد پرسنلی"
                  value={assignedOperator.personnelCode}
                />
                <TrackingInfo
                  label="واحد عملیاتی"
                  value={assignedOperator.agency}
                />
                <TrackingInfo
                  label="وسیله مأموریت"
                  value={assignedOperator.vehicle ?? "ثبت نشده"}
                />
              </div>

              <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <Route className="h-5 w-5 text-blue-600" />
                  <TrackingInfo
                    label="فاصله تا رخداد"
                    value={
                      distanceKm < 0.1
                        ? "در محل رخداد"
                        : `${distanceKm.toFixed(1)} کیلومتر`
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-violet-600" />
                  <TrackingInfo
                    label="زمان تقریبی رسیدن"
                    value={
                      estimatedMinutes === 0
                        ? "رسیده است"
                        : `${estimatedMinutes} دقیقه`
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-emerald-600" />
                  <TrackingInfo
                    label="آخرین موقعیت"
                    value={lastLocationUpdate.toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-3 sm:flex-row sm:items-center">
                <p className="text-xs leading-6 text-blue-900">
                  این ردیابی در نسخه MVP شبیه‌سازی شده و به GPS شخص واقعی متصل
                  نیست.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTrackingActive((current) => !current)}
                    disabled={status === "RESOLVED"}
                  >
                    {trackingActive ? "توقف شبیه‌سازی" : "شروع شبیه‌سازی"}
                  </Button>
                  <Button asChild type="button" size="sm" variant="outline">
                    <a href={`tel:${assignedOperator.phone}`}>
                      <Phone className="ml-1 h-4 w-4" /> تماس با مأمور
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            موقعیت رخداد و مأمور
          </CardTitle>
          {showRouting && (
            <Button
              size="sm"
              className="gap-2"
              onClick={handleRouting}
              disabled={routing}
            >
              {routing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {routing ? "در حال دریافت موقعیت..." : "مسیریابی با نشان"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-600" /> محل رخداد
            </span>
            {assignedOperator && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-600" /> موقعیت
                مأمور
              </span>
            )}
          </div>
          <LocationMap
            center={{ lat: incident.latitude, lng: incident.longitude }}
            height="320px"
            additionalMarkers={
              assignedOperator
                ? [
                    {
                      id: "assigned-agent",
                      position: agentPosition,
                      label: `${assignedOperator.name} — ${ASSIGNMENT_LABELS[assignmentState]}`,
                      color: "#2563eb",
                    },
                  ]
                : []
            }
            fitAllMarkers={Boolean(assignedOperator)}
          />
          <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
            موقعیت رخداد: {incident.address ?? `${incident.latitude.toFixed(6)}، ${incident.longitude.toFixed(6)}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          className={
            isAdmin
              ? undefined
              : "flex flex-row items-center justify-between space-y-0"
          }
        >
          <CardTitle className="text-base">وضعیت رسیدگی</CardTitle>
          {!isAdmin && (
            <Select
              value={status}
              onValueChange={updateStatus}
              disabled={updating}
            >
              <SelectTrigger className="h-9 w-40 text-sm">
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">{statusLabels.PENDING}</SelectItem>
                <SelectItem value="IN_PROGRESS">
                  {statusLabels.IN_PROGRESS}
                </SelectItem>
                <SelectItem value="RESOLVED">
                  {statusLabels.RESOLVED}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {incident.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز تاریخچه‌ای ثبت نشده است
            </p>
          ) : isAdmin ? (
            <div className="space-y-0">
              {incident.statusHistory.map((history, index) => {
                const isLast = index === incident.statusHistory.length - 1;
                return (
                  <div key={history.id} className="relative flex gap-3 pb-6">
                    {!isLast && (
                      <span className="absolute right-[5px] top-3 h-full w-px bg-slate-200" />
                    )}
                    <span
                      className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 bg-white ${
                        isLast
                          ? "border-blue-600"
                          : "border-slate-300"
                      }`}
                    />
                    <div className="pb-1">
                      <p className="text-sm font-medium text-slate-900">
                        {statusLabels[history.newStatus]}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(history.createdAt).toLocaleString("fa-IR")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {incident.statusHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(history.createdAt).toLocaleString("fa-IR")}
                  </span>
                  <span>
                    {history.oldStatus
                      ? `${statusLabels[history.oldStatus]} ← `
                      : ""}
                    {statusLabels[history.newStatus]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
            {isAdmin && imagePreviewOpen && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagePreviewOpen(false)}
        >
          <button
            type="button"
            aria-label="بستن تصویر"
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setImagePreviewOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={incident.imageUrl}
            alt="تصویر رخداد"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function TrackingInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}