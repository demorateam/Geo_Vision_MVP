"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ArrowRight, Clock, Loader2, MapPin, Navigation, Phone, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, SeverityBadge } from "@/components/dashboard/CitizenDashboard";
import { STATUS_LABELS } from "@/types";

const LocationMap = dynamic(
  () => import("@/components/map/LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground">
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
  imageUrl: string;
  createdAt: string | Date;
  agencies: { agencyName: string }[];
  reporter: { name: string; phone: string };
  statusHistory: StatusHistoryEntry[];
}

export function AgencyIncidentDetail({ incident }: { incident: IncidentDetail }) {
  const [status, setStatus] = useState(incident.status);
  const [updating, setUpdating] = useState(false);
  const [routing, setRouting] = useState(false);

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
      toast.success("وضعیت به‌روزرسانی شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در به‌روزرسانی");
    } finally {
      setUpdating(false);
    }
  };

  // Opens Neshan with both origin (operator's live GPS location) and
  // destination (the incident's coordinates) pre-filled, using Neshan's
  // documented deep link format: https://nshn.ir?origin=...&destination=...
  // This opens the native app if installed, otherwise falls back to the web.
  const handleRouting = () => {
    if (!navigator.geolocation) {
      toast.error("مرورگر شما از GPS پشتیبانی نمی‌کند");
      return;
    }
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        const destination = `${incident.latitude},${incident.longitude}`;
        const url = `https://nshn.ir?origin=${origin}&destination=${destination}&vehicle=d`;
        window.open(url, "_blank");
        setRouting(false);
      },
      () => {
        toast.error("دریافت موقعیت مکانی فعلی شما ناموفق بود. دسترسی GPS را بررسی کنید");
        setRouting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/agency/incidents" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" />
        بازگشت به فهرست رخدادها
      </Link>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-mono text-xl font-bold">{incident.incidentNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(incident.createdAt).toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={status} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <img src={incident.imageUrl} alt="" className="h-64 w-full object-cover md:h-80" />
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
              <p className="mb-1 text-xs font-medium text-muted-foreground">توضیحات گزارش‌دهنده</p>
              <p className="text-sm leading-7">{incident.description}</p>
            </div>
            {incident.aiSummary && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">خلاصه‌ی هوش مصنوعی</p>
                <p className="text-sm">{incident.aiSummary}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">سازمان‌های مسئول</p>
              <div className="flex flex-wrap gap-1">
                {incident.agencies.map((a) => (
                  <Badge key={a.agencyName} variant="outline">{a.agencyName}</Badge>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            موقعیت رخداد
          </CardTitle>
          <Button size="sm" className="gap-2" onClick={handleRouting} disabled={routing}>
            {routing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            {routing ? "در حال دریافت موقعیت..." : "مسیریابی با نشان"}
          </Button>
        </CardHeader>
        <CardContent>
          <LocationMap
            center={{ lat: incident.latitude, lng: incident.longitude }}
            height="280px"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            عرض جغرافیایی: {incident.latitude.toFixed(6)}، طول جغرافیایی: {incident.longitude.toFixed(6)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">وضعیت رسیدگی</CardTitle>
          <Select value={status} onValueChange={updateStatus} disabled={updating}>
            <SelectTrigger className="h-9 w-40 text-sm">
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">{STATUS_LABELS.PENDING}</SelectItem>
              <SelectItem value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</SelectItem>
              <SelectItem value="RESOLVED">{STATUS_LABELS.RESOLVED}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {incident.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز تاریخچه‌ای ثبت نشده است</p>
          ) : (
            <div className="space-y-3">
              {incident.statusHistory.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("fa-IR")}
                  </span>
                  <span>
                    {h.oldStatus ? `${STATUS_LABELS[h.oldStatus]} ← ` : ""}
                    {STATUS_LABELS[h.newStatus]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
