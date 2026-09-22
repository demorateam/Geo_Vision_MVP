import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AgencyIncidentDetail } from "@/components/dashboard/AgencyIncidentDetail";

export const dynamic = "force-dynamic";

export default async function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?portal=admin&redirect=/admin/incidents");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, name: true, phone: true } },
      agencies: true,
      assignedOperator: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!incident) notFound();

  return (
    <DashboardShell user={session}>
      <AgencyIncidentDetail
        incident={incident}
        backHref="/admin/incidents"
        backLabel="بازگشت به مدیریت رخدادها"
        showRouting={false}
      />
    </DashboardShell>
  );
}
