import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OperatorPerformanceDetail } from "@/components/dashboard/OperatorPerformanceDetail";

export const dynamic = "force-dynamic";

export default async function AdminOperatorPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const operator = await prisma.operator.findUnique({
    where: { id },
    include: {
      incidents: {
        include: {
          agencies: { select: { agencyName: true } },
        },
        orderBy: [{ assignedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!operator) notFound();

  return (
    <DashboardShell user={session}>
      <OperatorPerformanceDetail operator={operator} />
    </DashboardShell>
  );
}
