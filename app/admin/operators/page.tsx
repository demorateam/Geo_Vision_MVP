import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OperatorManagement } from "@/components/dashboard/OperatorManagement";

export const dynamic = "force-dynamic";

export default async function AdminOperatorsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const [incidents, operators] = await Promise.all([
    prisma.incident.findMany({
      include: {
        reporter: { select: { name: true, phone: true } },
        agencies: true,
        assignedOperator: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.operator.findMany({
      include: {
        incidents: {
          where: { status: { not: "RESOLVED" } },
          select: { id: true, incidentNumber: true, incidentType: true },
        },
      },
      orderBy: [{ agency: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <DashboardShell user={session}>
      <OperatorManagement incidents={incidents} operators={operators} />
    </DashboardShell>
  );
}
