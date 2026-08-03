import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const CreateSchema = z.object({
  imageUrl: z.string().min(1),
  description: z.string().min(5, "توضیحات حداقل ۵ کاراکتر"),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string().optional(),
  incidentType: z.string().optional(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  colorCode: z.string().optional(),
  aiSummary: z.string().optional(),
  assignedAgencies: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = requireAuth();
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
    const session = requireAuth();
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" }, { status: 400 });
    }
    const data = parsed.data;

    const count = await prisma.incident.count();
    const incidentNumber = `INC-${String(1000 + count + 1).padStart(4, "0")}`;

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
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
