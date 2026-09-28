import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AdminHeatmapView } from "@/components/dashboard/AdminHeatmapView";

export const dynamic = "force-dynamic";

export default async function AdminHeatmapPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const incidentsRaw = await prisma.incident.findMany({
    include: { agencies: true },
    orderBy: { createdAt: "desc" },
  });

  // فقط فیلدهای لازم برای نقشه/فیلترها/کارت‌های آماری + سریالایز کردن createdAt به رشته
  // (چون این آبجکت به یک Client Component پاس داده می‌شود)
  const incidents = incidentsRaw.map((i) => ({
    id: i.id,
    incidentNumber: i.incidentNumber,
    description: i.description,
    incidentType: i.incidentType,
    severity: i.severity,
    colorCode: i.colorCode,
    status: i.status,
    region: i.region,
    aiSummary: i.aiSummary,
    latitude: i.latitude,
    longitude: i.longitude,
    imageUrl: i.imageUrl,
    createdAt: i.createdAt.toISOString(),
    agencies: i.agencies.map((a: { agencyName: string }) => ({ agencyName: a.agencyName })),
  }));

  return (
    <DashboardShell user={session}>
      <AdminHeatmapView incidents={incidents} />
    </DashboardShell>
  );
}
