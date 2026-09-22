import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOperatorSession } from "@/lib/operator-auth";
import { OperatorShell } from "@/components/operator/OperatorShell";
import { OperatorDashboard } from "@/components/operator/OperatorDashboard";

export const dynamic = "force-dynamic";

export default async function OperatorHomePage() {
  const session = await getOperatorSession();
  if (!session) redirect("/operator/login");

  const operator = await prisma.operator.findFirst({
    where: { id: session.id, isActive: true },
  });
  if (!operator) redirect("/operator/login");

  const incidents = await prisma.incident.findMany({
    where: { assignedOperatorId: operator.id },
    orderBy: [{ completedAt: "asc" }, { assignedAt: "desc" }],
    select: {
      id: true,
      incidentNumber: true,
      incidentType: true,
      description: true,
      severity: true,
      status: true,
      operatorStatus: true,
      region: true,
      imageUrl: true,
      assignedAt: true,
      acceptedAt: true,
      completedAt: true,
    },
  });

  return (
    <OperatorShell operator={operator}>
      <OperatorDashboard operator={operator} incidents={incidents} />
    </OperatorShell>
  );
}
