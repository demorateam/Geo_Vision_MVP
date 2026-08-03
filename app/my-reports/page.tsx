import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MyReportsList } from "@/components/dashboard/MyReportsList";

export const dynamic = "force-dynamic";

export default async function MyReportsPage() {
  const session = getSession();
  if (!session) redirect("/login?redirect=/my-reports");

  const incidents = await prisma.incident.findMany({
    where: { reporterId: session.id },
    include: { agencies: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={session}>
      <MyReportsList incidents={incidents} />
    </DashboardShell>
  );
}
