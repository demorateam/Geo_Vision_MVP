"use client";

import { Building2, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, SEVERITY_LABELS, type IncidentStatus, type Severity } from "@/types";
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
  agencies: { agencyName: string }[];
}

export function AgencyDashboard({
  incidents,
  agencyName,
}: {
  incidents: Incident[];
  agencyName: string;
}) {
  const pending = incidents.filter((i) => i.status === "PENDING").length;
  const inProgress = incidents.filter((i) => i.status === "IN_PROGRESS").length;
  const resolved = incidents.filter((i) => i.status === "RESOLVED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">پنل اپراتور {agencyName}</h1>
        <p className="text-sm text-muted-foreground">رخدادهای محول شده به سازمان شما</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Building2} label="کل محول شده" value={incidents.length} color="blue" />
        <StatCard icon={Clock} label="در انتظار" value={pending} color="amber" />
        <StatCard icon={AlertCircle} label="در حال انجام" value={inProgress} color="orange" />
        <StatCard icon={CheckCircle2} label="حل شده" value={resolved} color="green" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">فهرست رخدادها</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              رخدادی به سازمان شما محول نشده است
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <img src={incident.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
