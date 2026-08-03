import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    requireAuth();

    const [total, pending, inProgress, resolved] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { status: "PENDING" } }),
      prisma.incident.count({ where: { status: "IN_PROGRESS" } }),
      prisma.incident.count({ where: { status: "RESOLVED" } }),
    ]);

    const byRegion = await prisma.incident.groupBy({
      by: ["region"],
      _count: { _all: true },
      orderBy: { _count: { region: "desc" } },
    });

    const bySeverity = await prisma.incident.groupBy({
      by: ["severity"],
      _count: { _all: true },
    });

    const byAgencyRaw = await prisma.incidentAgency.groupBy({
      by: ["agencyName"],
      _count: { _all: true },
      orderBy: { _count: { agencyName: "desc" } },
    });

    const recent = await prisma.incident.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { agencies: true, reporter: { select: { name: true } } },
    });

    return NextResponse.json({
      counts: { total, pending, inProgress, resolved },
      byRegion: byRegion.map((r) => ({ region: r.region, count: r._count._all })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count._all })),
      byAgency: byAgencyRaw.map((a) => ({ agency: a.agencyName, count: a._count._all })),
      recent,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
