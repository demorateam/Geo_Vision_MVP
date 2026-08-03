"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Clock, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Stats {
  counts: { total: number; pending: number; inProgress: number; resolved: number };
  byRegion: { region: string; _count: { _all: number } }[];
  bySeverity: { severity: string; _count: { _all: number } }[];
  byAgency: { agencyName: string; _count: { _all: number } }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};

const AGENCY_COLORS = ["#2563eb", "#22c55e", "#f97316", "#ef4444", "#a855f7", "#06b6d4", "#eab308", "#ec4899", "#64748b"];

export function AdminDashboard({ stats }: { stats: Stats }) {
  const regionData = stats.byRegion.map((r) => ({ name: r.region, count: r._count._all }));
  const severityData = stats.bySeverity.map((s) => ({ name: s.severity, value: s._count._all }));
  const agencyData = stats.byAgency.map((a) => ({ name: a.agencyName, count: a._count._all }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">پنل مدیریت</h1>
          <p className="text-sm text-muted-foreground">نمای کلی رخدادهای شهری</p>
        </div>
        <Link href="/admin/incidents">
          <Button variant="outline" className="gap-2">
            <ListChecks className="h-4 w-4" />
            مدیریت رخدادها
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="کل رخدادها" value={stats.counts.total} color="blue" />
        <StatCard icon={Clock} label="در انتظار" value={stats.counts.pending} color="amber" />
        <StatCard icon={AlertCircle} label="در حال انجام" value={stats.counts.inProgress} color="orange" />
        <StatCard icon={CheckCircle2} label="حل شده" value={stats.counts.resolved} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              رخدادها بر اساس منطقه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="تعداد" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزیع شدت رخدادها</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">رخدادها بر اساس سازمان</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agencyData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="تعداد" radius={[0, 4, 4, 0]}>
                  {agencyData.map((_, i) => (
                    <Cell key={i} fill={AGENCY_COLORS[i % AGENCY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
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
