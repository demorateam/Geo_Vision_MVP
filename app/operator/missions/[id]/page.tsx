import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOperatorSession } from "@/lib/operator-auth";
import { OperatorShell } from "@/components/operator/OperatorShell";
import { OperatorMissionDetail } from "@/components/operator/OperatorMissionDetail";

export const dynamic = "force-dynamic";

export default async function OperatorMissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getOperatorSession();
  if (!session) redirect("/operator/login");
  const { id } = await params;

  const [operator, incident] = await Promise.all([
    prisma.operator.findFirst({ where: { id: session.id, isActive: true } }),
    prisma.incident.findFirst({
      where: { id, assignedOperatorId: session.id },
      include: {
        reporter: { select: { name: true, phone: true } },
        agencies: { select: { agencyName: true } },
      },
    }),
  ]);

  if (!operator) redirect("/operator/login");
  if (!incident) notFound();
  return (
    <OperatorShell operator={operator}>
      <OperatorMissionDetail incident={incident} />
    </OperatorShell>
  );
}
