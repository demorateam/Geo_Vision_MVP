import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperatorSession } from "@/lib/operator-auth";

const MISSION_STATES = [
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "WORKING",
  "COMPLETED",
] as const;

const UpdateMissionSchema = z.object({
  status: z.enum(MISSION_STATES),
  completionNote: z.string().trim().max(500).optional(),
});

const NEXT_STATE: Record<string, (typeof MISSION_STATES)[number]> = {
  ASSIGNED: "ACCEPTED",
  ACCEPTED: "EN_ROUTE",
  EN_ROUTE: "ARRIVED",
  ARRIVED: "WORKING",
  WORKING: "COMPLETED",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireOperatorSession();
    const { id } = await params;
    const parsed = UpdateMissionSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات وضعیت مأموریت نامعتبر است" },
        { status: 400 },
      );
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        assignedOperatorId: session.id,
        assignedOperator: { isActive: true },
      },
      select: { id: true, status: true, operatorStatus: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "مأموریت یافت نشد یا به شما تخصیص ندارد" },
        { status: 404 },
      );
    }

    if (
      incident.status === "RESOLVED" &&
      incident.operatorStatus !== "COMPLETED"
    ) {
      return NextResponse.json(
        { error: "این رخداد از قبل توسط مدیر بسته شده است" },
        { status: 409 },
      );
    }

    const currentState = incident.operatorStatus ?? "ASSIGNED";
    const expectedState = NEXT_STATE[currentState];
    if (parsed.data.status !== expectedState) {
      return NextResponse.json(
        {
          error:
            currentState === "COMPLETED"
              ? "این مأموریت قبلاً پایان یافته است"
              : "ترتیب مراحل مأموریت رعایت نشده است",
        },
        { status: 409 },
      );
    }

    if (
      parsed.data.status === "COMPLETED" &&
      (parsed.data.completionNote?.length ?? 0) < 3
    ) {
      return NextResponse.json(
        { error: "برای پایان مأموریت، گزارش کوتاهی ثبت کنید" },
        { status: 400 },
      );
    }

    const now = new Date();
    const nextIncidentStatus =
      parsed.data.status === "COMPLETED" ? "RESOLVED" : "IN_PROGRESS";

    const timestampData: Prisma.IncidentUpdateInput = {};
    if (parsed.data.status === "ACCEPTED") timestampData.acceptedAt = now;
    if (parsed.data.status === "EN_ROUTE") timestampData.enRouteAt = now;
    if (parsed.data.status === "ARRIVED") timestampData.arrivedAt = now;
    if (parsed.data.status === "WORKING") timestampData.workStartedAt = now;
    if (parsed.data.status === "COMPLETED") {
      timestampData.completedAt = now;
      timestampData.completionNote = parsed.data.completionNote?.trim() ?? null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.incident.update({
        where: { id },
        data: {
          operatorStatus: parsed.data.status,
          status: nextIncidentStatus,
          ...timestampData,
        },
        include: {
          assignedOperator: true,
          agencies: true,
          reporter: { select: { id: true, name: true, phone: true } },
        },
      });

      if (incident.status !== nextIncidentStatus) {
        await tx.incidentStatusHistory.create({
          data: {
            incidentId: id,
            oldStatus: incident.status,
            newStatus: nextIncidentStatus,
          },
        });
      }

      return result;
    });

    return NextResponse.json({ incident: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "OPERATOR_UNAUTHORIZED") {
      return NextResponse.json(
        { error: "نشست شما منقضی شده است؛ دوباره وارد شوید" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "خطای سرور در به‌روزرسانی مأموریت" },
      { status: 500 },
    );
  }
}
