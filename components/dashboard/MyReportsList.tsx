"use client";

import Link from "next/link";
import { FilePlus, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, SeverityBadge } from "@/components/dashboard/CitizenDashboard";

interface Incident {
  id: string;
  incidentNumber: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  region: string;
  createdAt: string | Date;
  imageUrl: string;
  latitude: number;
  longitude: number;
  agencies: { agencyName: string }[];
}

export function MyReportsList({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">گزارش‌های من</h1>
          <p className="text-sm text-muted-foreground">{incidents.length} رخداد ثبت شده</p>
        </div>
        <Link href="/report">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            ثبت رخداد جدید
          </Button>
        </Link>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FilePlus className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">هنوز رخدادی ثبت نکرده‌اید</p>
            <p className="mb-4 text-sm text-muted-foreground">اولین رخداد شهری خود را ثبت کنید</p>
            <Link href="/report">
              <Button>ثبت رخداد</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incidents.map((incident) => (
            <Card key={incident.id} className="overflow-hidden">
              <div className="relative h-40">
                <img src={incident.imageUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{incident.incidentNumber}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(incident.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
                <p className="mb-2 line-clamp-2 text-sm">{incident.description}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {incident.region} - {incident.incidentType}
                </div>
                {incident.agencies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {incident.agencies.map((a) => (
                      <span key={a.agencyName} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{a.agencyName}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
