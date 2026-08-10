import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { z } from "zod";
import { randomInt } from "crypto";
import { AGENCY_LIST } from "@/types";

const CreateSchema = z.object({
  imageUrl: z.string().startsWith("/uploads/", "مسیر تصویر نامعتبر است"),
  description: z.string().min(5, "توضیحات حداقل ۵ کاراکتر").max(2000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  region: z.string().max(100).optional(),
  incidentType: z.string().max(100).optional(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  colorCode: z.string().optional(),
  aiSummary: z.string().max(1000).optional(),
  assignedAgencies: z.array(z.enum(AGENCY_LIST)).max(AGENCY_LIST.length).optional(),
});

export async function GET() {
  try {
    const session = await requireAuth();
    const where = session.role === "CITIZEN" ? { reporterId: session.id } : session.role === "AGENCY" ? { agencies: { some: { agencyName: session.agency ?? "" } } } : {};
    const incidents = await prisma.incident.findMany({
      where,
      include: { reporter: { select: { id: true, name: true, phone: true } }, agencies: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ incidents });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("CITIZEN");
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" }, { status: 400 });
    }
    const data = parsed.data;

    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const incidentNumber = `INC-${datePart}-${randomInt(100000, 1000000)}`;

    const incident = await prisma.incident.create({
      data: {
        incidentNumber,
        reporterId: session.id,
        imageUrl: data.imageUrl,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        region: data.region ?? "نامشخص",
        incidentType: data.incidentType ?? "نامشخص",
        severity: data.severity ?? "Medium",
        colorCode: data.colorCode ?? "Yellow",
        aiSummary: data.aiSummary ?? null,
        agencies: data.assignedAgencies?.length
          ? { create: data.assignedAgencies.map((name) => ({ agencyName: name })) }
          : undefined,
      },
      include: { agencies: true },
    });

    await prisma.incidentStatusHistory.create({
      data: { incidentId: incident.id, oldStatus: null, newStatus: "PENDING" },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "فقط شهروندان می‌توانند رخداد ثبت کنند" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
