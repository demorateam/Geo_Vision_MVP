"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpDown,
  CheckCircle2,
  Eye,
  Loader2,
  Search,
  UserRoundCheck,
  UserRoundSearch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SeverityBadge } from "@/components/dashboard/CitizenDashboard";
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
  assignedOperator: {
    id: string;
    name: string;
    personnelCode: string;
    agency: string;
  } | null;
}

// فقط تاریخ و شدت قابل Sort هستند
type SortKey = "createdAt" | "severity";

const PAGE_SIZE = 20;

const OPERATOR_STATE = {
  UNASSIGNED: {
    label: "تخصیص داده نشده",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    Icon: UserRoundSearch,
  },
  ASSIGNED: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
    Icon: UserRoundCheck,
  },
  RESOLVED: {
    label: "رسیدگی انجام شده",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
} as const;

// شماره‌گذاری صفحات با نقاط سه‌گانه برای تعداد صفحات زیاد
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [rows, setRows] = useState(incidents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // منطقه‌های شهری از همان داده رخدادها (data source واقعی پروژه) ساخته می‌شود
  const regionOptions = useMemo(
    () => Array.from(new Set(rows.map((incident) => incident.region))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let result = [...rows];

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (incident) =>
          incident.incidentNumber.toLowerCase().includes(query) ||
          incident.description.toLowerCase().includes(query) ||
          incident.incidentType.toLowerCase().includes(query) ||
          incident.region.toLowerCase().includes(query) ||
          incident.assignedOperator?.name.toLowerCase().includes(query),
      );
    }

    if (regionFilter !== "ALL") {
      result = result.filter((incident) => incident.region === regionFilter);
    }
    if (statusFilter !== "ALL") {
      result = result.filter((incident) => incident.status === statusFilter);
    }
    if (severityFilter !== "ALL") {
      result = result.filter(
        (incident) => incident.severity === severityFilter,
      );
    }

    result.sort((first, second) => {
      let comparison = 0;
      if (sortKey === "createdAt") {
        comparison =
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime();
      } else {
        const order: Record<string, number> = {
          Low: 1,
          Medium: 2,
          High: 3,
          Critical: 4,
        };
        comparison =
          (order[first.severity] ?? 0) - (order[second.severity] ?? 0);
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [rows, search, regionFilter, statusFilter, severityFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Data → Filter → Sort → Pagination → Render
  const paginated = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // با تغییر فیلتر یا Sort، به صفحه اول برگرد
  useEffect(() => {
    setCurrentPage(1);
  }, [search, regionFilter, statusFilter, severityFilter, sortKey, sortDir]);

  // اگر صفحه فعلی بعد از تغییر داده دیگر معتبر نبود
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("وضعیت رخداد به‌روزرسانی شد");
      setRows((current) =>
        current.map((incident) =>
          incident.id === id ? { ...incident, status } : incident,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "خطا در به‌روزرسانی",
      );
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="منطقه شهری" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">همه مناطق</SelectItem>
            {regionOptions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
            <SelectItem value="PENDING">{STATUS_LABELS.PENDING}</SelectItem>
            <SelectItem value="IN_PROGRESS">
              {STATUS_LABELS.IN_PROGRESS}
            </SelectItem>
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b bg-slate-50 text-right">
                <tr>
                  <th className="px-4 py-3 font-medium">شماره</th>
                  <th
                    className="cursor-pointer px-4 py-3 font-medium"
                    onClick={() => toggleSort("createdAt")}
                  >
                    <span className="flex items-center gap-1">
                      تاریخ <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">نوع</th>
                  <th
                    className="cursor-pointer px-4 py-3 font-medium"
                    onClick={() => toggleSort("severity")}
                  >
                    <span className="flex items-center gap-1">
                      شدت <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">منطقه</th>
                  <th className="px-4 py-3 font-medium">سازمان</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      رخدادی یافت نشد
                    </td>
                  </tr>
                ) : (
                  paginated.map((incident) => {
                    const operatorState = incident.assignedOperator
                      ? incident.status === "RESOLVED"
                        ? OPERATOR_STATE.RESOLVED
                        : {
                            ...OPERATOR_STATE.ASSIGNED,
                            label: incident.assignedOperator.name,
                          }
                      : OPERATOR_STATE.UNASSIGNED;
                    const OperatorIcon = operatorState.Icon;

                    return (
                      <tr
                        key={incident.id}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {incident.incidentNumber}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(incident.createdAt).toLocaleDateString(
                            "fa-IR",
                          )}
                        </td>
                        <td className="px-4 py-3">{incident.incidentType}</td>
                        <td className="px-4 py-3">
                          <SeverityBadge severity={incident.severity} />
                        </td>
                        <td className="px-4 py-3">{incident.region}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {incident.agencies.map((agency) => (
                              <span
                                key={agency.agencyName}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-xs"
                              >
                                {agency.agencyName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-40 flex-col items-start gap-2">
                            <Select
                              value={incident.status}
                              onValueChange={(value) =>
                                updateStatus(incident.id, value)
                              }
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
                                <SelectItem value="PENDING">
                                  {STATUS_LABELS.PENDING}
                                </SelectItem>
                                <SelectItem value="IN_PROGRESS">
                                  {STATUS_LABELS.IN_PROGRESS}
                                </SelectItem>
                                <SelectItem value="RESOLVED">
                                  {STATUS_LABELS.RESOLVED}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${operatorState.className}`}
                            >
                              <OperatorIcon className="h-3 w-3" />
                              {operatorState.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 whitespace-nowrap text-xs"
                          >
                            <Link href={`/admin/incidents/${incident.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              مشاهده جزئیات
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
            {getPageNumbers(currentPage, totalPages).map((page, idx) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
