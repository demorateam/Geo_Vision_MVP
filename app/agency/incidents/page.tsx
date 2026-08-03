import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AgencyIncidentsManager } from "@/components/dashboard/AgencyIncidentsManager";

export const dynamic = "force-dynamic";

export default async function AgencyIncidentsPage() {
  const session = getSession();
  if (!session || session.role !== "AGENCY") redirect("/dashboard");

  const incidents = await prisma.incident.findMany({
    where: { agencies: { some: { agencyName: session.agency ?? "" } } },
    include: { agencies: true, reporter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={session}>
      <AgencyIncidentsManager incidents={incidents} agencyName={session.agency ?? ""} />
    </DashboardShell>
  );
}
