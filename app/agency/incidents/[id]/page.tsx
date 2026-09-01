import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AgencyIncidentDetail } from "@/components/dashboard/AgencyIncidentDetail";

export const dynamic = "force-dynamic"; 

export default async function AgencyIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "AGENCY") redirect("/dashboard");

  const { id } = await params;
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, name: true, phone: true } },
      agencies: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!incident) notFound();

  const belongsToAgency = incident.agencies.some((a) => a.agencyName === session.agency);
  if (!belongsToAgency) redirect("/agency/incidents");

  return (
    <DashboardShell user={session}>
      <AgencyIncidentDetail incident={incident} />
    </DashboardShell>
  );
}
