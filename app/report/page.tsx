import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { IncidentReportForm } from "@/components/forms/IncidentReportForm";

export const dynamic = "force-dynamic";

export default function ReportPage() {
  const session = getSession();
  if (!session) redirect("/login?redirect=/report");

  return (
    <DashboardShell user={session}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ثبت رخداد جدید</h1>
        <p className="text-sm text-muted-foreground">مراحل ثبت رخداد را به ترتیب تکمیل کنید</p>
      </div>
      <IncidentReportForm />
    </DashboardShell>
  );
}
