import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const operators = await prisma.operator.findMany({
      include: {
        incidents: {
          where: { status: { not: "RESOLVED" } },
          select: { id: true, incidentNumber: true, incidentType: true },
        },
      },
      orderBy: [{ agency: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ operators });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "احراز هویت لازم است" },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
