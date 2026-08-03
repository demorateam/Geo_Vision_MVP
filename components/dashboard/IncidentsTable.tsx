"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, ArrowUpDown, Loader2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, SeverityBadge } from "@/components/dashboard/CitizenDashboard";
import { STATUS_LABELS } from "@/types";

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
  reporter: { name: string };
}

type SortKey = "incidentNumber" | "createdAt" | "severity" | "region";

export function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...incidents];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.incidentNumber.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.incidentType.toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "ALL") result = result.filter((i) => i.status === statusFilter);
    if (severityFilter !== "ALL") result = result.filter((i) => i.severity === severityFilter);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "severity") {
        const order: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
        cmp = (order[a.severity] ?? 0) - (order[b.severity] ?? 0);
      } else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [incidents, search, statusFilter, severityFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

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
      toast.success("وضعیت رخداد به‌روزرسانی شد");
      // Update local state
      const idx = incidents.findIndex((i) => i.id === id);
      if (idx >= 0) incidents[idx] = { ...incidents[idx], status };
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در به‌روزرسانی");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مدیریت رخدادها</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} رخداد</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
            <SelectItem value="PENDING">{STATUS_LABELS.PENDING}</SelectItem>
            <SelectItem value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</SelectItem>
            <SelectItem value="RESOLVED">{STATUS_LABELS.RESOLVED}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="شدت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">همه شدت‌ها</SelectItem>
            <SelectItem value="Low">کم</SelectItem>
            <SelectItem value="Medium">متوسط</SelectItem>
            <SelectItem value="High">زیاد</SelectItem>
            <SelectItem value="Critical">بحرانی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-right">
                <tr>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("incidentNumber")}>
                    <span className="flex items-center gap-1">شماره <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("createdAt")}>
                    <span className="flex items-center gap-1">تاریخ <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">نوع</th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("severity")}>
                    <span className="flex items-center gap-1">شدت <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("region")}>
                    <span className="flex items-center gap-1">منطقه <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">سازمان</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      رخدادی یافت نشد
                    </td>
                  </tr>
                ) : (
                  filtered.map((incident) => (
                    <tr key={incident.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{incident.incidentNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(incident.createdAt).toLocaleDateString("fa-IR")}
                      </td>
                      <td className="px-4 py-3">{incident.incidentType}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={incident.severity} /></td>
                      <td className="px-4 py-3">{incident.region}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {incident.agencies.map((a) => (
                            <span key={a.agencyName} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{a.agencyName}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
