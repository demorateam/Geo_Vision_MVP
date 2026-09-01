"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MapPin, Clock, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, SeverityBadge } from "@/components/dashboard/CitizenDashboard";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/types";

interface Incident {
  id: string;
  incidentNumber: string;
  description: string;
  incidentType: string;
  severity: string;
  status: string;
  region: string;
  aiSummary: string | null;
  createdAt: string | Date;
  imageUrl: string;
  latitude: number;
  longitude: number;
  agencies: { agencyName: string }[];
  reporter: { name: string };
}

export function AgencyIncidentsManager({
  incidents,
  agencyName,
}: {
  incidents: Incident[];
  agencyName: string;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localIncidents, setLocalIncidents] = useState(incidents);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocalIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      toast.success("وضعیت به‌روزرسانی شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در به‌روزرسانی");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">رخدادهای محول شده به {agencyName}</h1>
        <p className="text-sm text-muted-foreground">{localIncidents.length} رخداد</p>
      </div>

      {localIncidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            رخدادی به سازمان شما محول نشده است
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {localIncidents.map((incident) => (
            <Card key={incident.id} className="overflow-hidden">
              <Link href={`/agency/incidents/${incident.id}`} className="block">
                <div className="relative h-36">
                  <img src={incident.imageUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1">
                    <SeverityBadge severity={incident.severity} />
                  </div>
                </div>
              </Link>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{incident.incidentNumber}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(incident.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
                <p className="mb-2 line-clamp-2 text-sm">{incident.description}</p>
                <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {incident.region} - {incident.incidentType}
                </div>
                {incident.aiSummary && (
                  <p className="mb-3 rounded bg-slate-50 p-2 text-xs text-muted-foreground">{incident.aiSummary}</p>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <StatusBadge status={incident.status} />
                  <Select
                    value={incident.status}
                    onValueChange={(v) => updateStatus(incident.id, v)}
                    disabled={updatingId === incident.id}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      {updatingId === incident.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">{STATUS_LABELS.PENDING}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</SelectItem>
                      <SelectItem value="RESOLVED">{STATUS_LABELS.RESOLVED}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Link href={`/agency/incidents/${incident.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    مشاهده جزئیات و مسیریابی
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}