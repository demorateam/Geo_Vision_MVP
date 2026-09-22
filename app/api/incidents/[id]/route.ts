import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const UpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]).optional(),
});

const incidentInclude = {
  reporter: { select: { id: true, name: true, phone: true } },
  agencies: true,
  assignedOperator: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: incidentInclude,
    });

    if (!incident) {
      return NextResponse.json({ error: "رخداد یافت نشد" }, { status: 404 });
    }

    const canRead =
      session.role === "ADMIN" ||
      (session.role === "CITIZEN" && incident.reporterId === session.id) ||
      (session.role === "AGENCY" &&
        incident.agencies.some(
          (agency) => agency.agencyName === session.agency,
        ));

    if (!canRead) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    // Field-operator contact data is operational information and is not exposed
    // through the citizen-facing read path.
    const visibleIncident =
      session.role === "CITIZEN"
        ? { ...incident, assignedOperator: null }
        : incident;
    return NextResponse.json({ incident: visibleIncident });
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const parsed = UpdateSchema.safeParse(await req.json());

    if (!parsed.success || !parsed.data.status) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { agencies: true },
    });

    if (!incident) {
      return NextResponse.json({ error: "رخداد یافت نشد" }, { status: 404 });
    }

    const canUpdate =
      session.role === "ADMIN" ||
      (session.role === "AGENCY" &&
        incident.agencies.some(
          (agency) => agency.agencyName === session.agency,
        ));

    if (!canUpdate) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const newStatus = parsed.data.status;
    const updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.incident.update({
        where: { id },
        data: { status: newStatus },
        include: incidentInclude,
      });

      if (incident.status !== newStatus) {
        await transaction.incidentStatusHistory.create({
          data: { incidentId: id, oldStatus: incident.status, newStatus },
        });
      }
      return result;
    });

    return NextResponse.json({ incident: updated });
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
