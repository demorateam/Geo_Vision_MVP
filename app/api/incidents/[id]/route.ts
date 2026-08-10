import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, phone: true } },
        agencies: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!incident) {
      return NextResponse.json({ error: "رخداد یافت نشد" }, { status: 404 });
    }
    const canRead = session.role === "ADMIN" ||
      (session.role === "CITIZEN" && incident.reporterId === session.id) ||
      (session.role === "AGENCY" && incident.agencies.some((agency) => agency.agencyName === session.agency));
    if (!canRead) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    }
    return NextResponse.json({ incident });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { agencies: true },
    });
    if (!incident) {
      return NextResponse.json({ error: "رخداد یافت نشد" }, { status: 404 });
    }
    const canUpdate = session.role === "ADMIN" ||
      (session.role === "AGENCY" && incident.agencies.some((agency) => agency.agencyName === session.agency));
    if (!canUpdate) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const oldStatus = incident.status;
    const newStatus = parsed.data.status ?? oldStatus;

    const updated = await prisma.incident.update({
      where: { id },
      data: { status: newStatus },
      include: { agencies: true, reporter: { select: { id: true, name: true, phone: true } } },
    });

    if (oldStatus !== newStatus) {
      await prisma.incidentStatusHistory.create({
        data: { incidentId: incident.id, oldStatus: oldStatus, newStatus },
      });
    }

    return NextResponse.json({ incident: updated });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
