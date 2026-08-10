import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AdminMapView } from "@/components/dashboard/AdminMapView";

export const dynamic = "force-dynamic";

export default async function AdminMapPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const incidents = await prisma.incident.findMany({
    include: { agencies: true, reporter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell user={session}>
      <AdminMapView incidents={incidents} />
    </DashboardShell>
  );
}
