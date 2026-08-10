import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CitizenDashboard } from "@/components/dashboard/CitizenDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { AgencyDashboard } from "@/components/dashboard/AgencyDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ADMIN") {
    const stats = await getStats();
    return (
      <DashboardShell user={session}>
        <AdminDashboard stats={stats} />
      </DashboardShell>
    );
  }

  if (session.role === "AGENCY") {
    const incidents = await prisma.incident.findMany({
      where: { agencies: { some: { agencyName: session.agency ?? "" } } },
      include: { reporter: { select: { name: true } }, agencies: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <DashboardShell user={session}>
        <AgencyDashboard incidents={incidents} agencyName={session.agency ?? ""} />
      </DashboardShell>
    );
  }

  // Citizen
  const incidents = await prisma.incident.findMany({
    where: { reporterId: session.id },
    include: { agencies: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <DashboardShell user={session}>
      <CitizenDashboard incidents={incidents} userName={session.name} />
    </DashboardShell>
  );
}

async function getStats() {
  const [total, pending, inProgress, resolved] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.count({ where: { status: "PENDING" } }),
    prisma.incident.count({ where: { status: "IN_PROGRESS" } }),
    prisma.incident.count({ where: { status: "RESOLVED" } }),
  ]);
  const byRegion = await prisma.incident.groupBy({ by: ["region"], _count: { _all: true }, orderBy: { _count: { region: "desc" } } });
  const bySeverity = await prisma.incident.groupBy({ by: ["severity"], _count: { _all: true } });
  const byAgency = await prisma.incidentAgency.groupBy({ by: ["agencyName"], _count: { _all: true }, orderBy: { _count: { agencyName: "desc" } } });
  return { counts: { total, pending, inProgress, resolved }, byRegion, bySeverity, byAgency };
}
