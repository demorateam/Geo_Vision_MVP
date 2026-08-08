import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { IncidentsTable } from "@/components/dashboard/IncidentsTable";

export const dynamic = "force-dynamic";

export default async function AdminIncidentsPage() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const incidents = await prisma.incident.findMany({
    include: { reporter: { select: { name: true } }, agencies: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={session}>
      <IncidentsTable incidents={incidents} />
    </DashboardShell>
  );
}