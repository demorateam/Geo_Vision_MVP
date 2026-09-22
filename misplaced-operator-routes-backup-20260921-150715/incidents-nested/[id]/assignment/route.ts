import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const AssignmentSchema = z.object({ operatorId: z.string().min(1).nullable() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "فقط مدیر سیستم مجاز به تخصیص اپراتور است" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const parsed = AssignmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات تخصیص نامعتبر است" },
        { status: 400 },
      );
    }

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { agencies: true },
    });
    if (!incident) {
      return NextResponse.json({ error: "رخداد یافت نشد" }, { status: 404 });
    }

    const operatorId = parsed.data.operatorId;
    if (operatorId) {
      const operator = await prisma.operator.findUnique({
        where: { id: operatorId },
        include: {
          incidents: {
            where: { status: { not: "RESOLVED" }, id: { not: id } },
            select: { id: true },
          },
        },
      });

      if (!operator) {
        return NextResponse.json(
          { error: "اپراتور یافت نشد" },
          { status: 404 },
        );
      }
      if (operator.status !== "AVAILABLE") {
        return NextResponse.json(
          { error: "اپراتور در حال حاضر فعال نیست" },
          { status: 409 },
        );
      }
      if (
        !incident.agencies.some(
          (agency) => agency.agencyName === operator.agency,
        )
      ) {
        return NextResponse.json(
          { error: "سازمان اپراتور با سازمان مسئول رخداد مطابقت ندارد" },
          { status: 409 },
        );
      }
      if (operator.incidents.length > 0) {
        return NextResponse.json(
          { error: "این اپراتور در حال رسیدگی به رخداد دیگری است" },
          { status: 409 },
        );
      }
    }

    const assignmentChanged = incident.assignedOperatorId !== operatorId;
    const updated = await prisma.incident.update({
      where: { id },
      data: assignmentChanged
        ? {
            assignedOperatorId: operatorId,
            assignedAt: operatorId ? new Date() : null,
            operatorStatus: operatorId ? "ASSIGNED" : null,
            acceptedAt: null,
            enRouteAt: null,
            arrivedAt: null,
            workStartedAt: null,
            completedAt: null,
            completionNote: null,
          }
        : {},
      include: { assignedOperator: true },
    });

    return NextResponse.json({
      incidentId: updated.id,
      assignedAt: updated.assignedAt,
      assignedOperator: updated.assignedOperator,
    });
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
