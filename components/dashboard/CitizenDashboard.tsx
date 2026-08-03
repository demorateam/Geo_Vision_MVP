"use client";

import Link from "next/link";
import { FilePlus, ListChecks, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, SEVERITY_LABELS, type IncidentStatus, type Severity } from "@/types";

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
  agencies: { agencyName: string }[];
}

export function CitizenDashboard({
  incidents,
  userName,
}: {
  incidents: Incident[];
  userName: string;
}) {
  const pending = incidents.filter((i) => i.status === "PENDING").length;
  const inProgress = incidents.filter((i) => i.status === "IN_PROGRESS").length;
  const resolved = incidents.filter((i) => i.status === "RESOLVED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">سلام {userName} 👋</h1>
          <p className="text-sm text-muted-foreground">گزارش‌های رخداد شهری شما</p>
        </div>
        <Link href="/report">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            ثبت رخداد جدید
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="کل رخدادها" value={incidents.length} color="blue" />
        <StatCard icon={Clock} label="در انتظار" value={pending} color="amber" />
        <StatCard icon={AlertCircle} label="در حال انجام" value={inProgress} color="orange" />
        <StatCard icon={CheckCircle2} label="حل شده" value={resolved} color="green" />
      </div>

      {/* Recent incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">آخرین گزارش‌های شما</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FilePlus className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">هنوز رخدادی ثبت نکرده‌اید</p>
              <Link href="/report">
                <Button variant="outline" size="sm" className="mt-3">ثبت اولین رخداد</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <img src={incident.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{incident.incidentNumber}</span>
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <p className="mt-1 truncate text-sm">{incident.description}</p>
                    <p className="text-xs text-muted-foreground">{incident.region} - {incident.incidentType}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Low: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    High: "bg-orange-100 text-orange-700",
    Critical: "bg-red-100 text-red-700",
  };
  return <Badge className={map[severity] ?? "bg-slate-100 text-slate-700"} variant="secondary">{SEVERITY_LABELS[severity as Severity] ?? severity}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    RESOLVED: "bg-green-100 text-green-700",
  };
  return <Badge className={map[status] ?? "bg-slate-100 text-slate-700"} variant="secondary">{STATUS_LABELS[status as IncidentStatus] ?? status}</Badge>;
}
