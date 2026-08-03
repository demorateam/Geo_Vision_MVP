import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGENCIES = [
  "شهرداری",
  "نهادهای امنیتی",
  "مخابرات",
  "آب و فاضلاب",
  "اداره برق",
  "گاز",
  "اورژانس",
  "پلیس",
  "آتش نشانی",
];

const REGIONS = [
  "منطقه ۱", "منطقه ۳", "منطقه ۵", "منطقه ۶", "منطقه ۷",
  "منطقه ۸", "منطقه ۱۰", "منطقه ۱۲", "منطقه ۱۴", "منطقه ۱۵",
  "منطقه ۱۷", "منطقه ۱۹", "منطقه ۲۰", "منطقه ۲۲",
];

const SEVERITIES: string[] = ["Low", "Medium", "High", "Critical"];
const COLORS: Record<string, string> = { Low: "Green", Medium: "Yellow", High: "Orange", Critical: "Red" };
const STATUSES: string[] = ["PENDING", "IN_PROGRESS", "RESOLVED"];

const INCIDENT_TEMPLATES = [
  { type: "نشتی گاز", desc: "بوی گاز شدیدی از لوله بیرون می‌آید. خطرناک است.", agencies: ["گاز", "آتش نشانی", "اورژانس"], sev: "Critical" as string },
  { type: "حریق", desc: "آتش در یک ساختمان مسکونی گرفته و دود زیادی تولید می‌کند.", agencies: ["آتش نشانی", "اورژانس", "پلیس"], sev: "Critical" as string },
  { type: "تصادف", desc: "تصادف بین دو خودرو در تقاطع رخ داده و مسدود شده.", agencies: ["پلیس", "اورژانس"], sev: "High" as string },
  { type: "خرابی آسفالت", desc: "چاله عمیقی در وسط خیابان ایجاد شده و خطر تصادف دارد.", agencies: ["شهرداری"], sev: "Medium" as string },
  { type: "مشکل آب و فاضلاب", desc: "لوله آب ترکیده و آب در خیابان جاری است.", agencies: ["آب و فاضلاب", "شهرداری"], sev: "High" as string },
  { type: "مشکل برق", desc: "سیم برق قطع شده و روی زمین افتاده. خطر برق گرفتگی.", agencies: ["اداره برق", "شهرداری"], sev: "High" as string },
  { type: "مشکل پسماند", desc: "زباله‌ها در خیابان انباشته و بوی بدی تولید می‌کنند.", agencies: ["شهرداری"], sev: "Low" as string },
  { type: "خرابی چراغ", desc: "چراغ خیابان سه روز است روشن نمی‌شود و شب تاریک است.", agencies: ["شهرداری", "اداره برق"], sev: "Low" as string },
  { type: "خطر درخت", desc: "شاخه بزرگ درخت روی جاده افتاده و مسیر را بسته.", agencies: ["شهرداری", "اورژانس"], sev: "Medium" as string },
  { type: "سرقت", desc: "دزدی از یک مغازه گزارش شده، مجرم فرار کرده.", agencies: ["پلیس", "نهادهای امنیتی"], sev: "Medium" as string },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  console.log("Seeding database...");

  // Clean
  await prisma.incidentStatusHistory.deleteMany();
  await prisma.incidentAgency.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const users = await Promise.all([
    prisma.user.create({ data: { name: "مدیر سیستم", phone: "09120000001", role: "ADMIN" } }),
    prisma.user.create({ data: { name: "علی رضایی", phone: "09120000002", role: "CITIZEN" } }),
    prisma.user.create({ data: { name: "مریم احمدی", phone: "09120000003", role: "CITIZEN" } }),
    prisma.user.create({ data: { name: "اپراتور شهرداری", phone: "09120000004", role: "AGENCY", agency: "شهرداری" } }),
    prisma.user.create({ data: { name: "اپراتور آتش نشانی", phone: "09120000005", role: "AGENCY", agency: "آتش نشانی" } }),
  ]);

  const citizens = users.filter((u) => u.role === "CITIZEN");

  // Incidents
  const totalIncidents = 30;
  for (let i = 0; i < totalIncidents; i++) {
    const template = randomItem(INCIDENT_TEMPLATES);
    const reporter = randomItem(citizens);
    const region = randomItem(REGIONS);
    const severity = template.sev;
    const status = randomItem(STATUSES);
    const createdAt = randomDate(30);
    const incidentNumber = `INC-${String(1000 + i).padStart(4, "0")}`;
    const lat = randomFloat(35.55, 35.82);
    const lng = randomFloat(51.2, 51.6);

    const incident = await prisma.incident.create({
      data: {
        incidentNumber,
        reporterId: reporter.id,
        imageUrl: `https://images.pexels.com/photos/${randomItem([3822622, 3823032, 361104, 280193, 280165, 2614818, 2614818, 248537, 248537, 248537])}/?auto=compress&cs=tinysrgb&w=600`,
        description: template.desc,
        latitude: lat,
        longitude: lng,
        region,
        incidentType: template.type,
        severity,
        colorCode: COLORS[severity],
        aiSummary: `تحلیل خودکار: ${template.type} در ${region}. ${template.desc}`,
        status,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 3600000),
      },
    });

    // Agencies
    for (const agencyName of template.agencies) {
      await prisma.incidentAgency.create({
        data: { incidentId: incident.id, agencyName, assignedAt: createdAt },
      });
    }

    // Status history
    const statusesOrder: string[] = ["PENDING", "IN_PROGRESS", "RESOLVED"];
    const currentIndex = statusesOrder.indexOf(status);
    let prev: string | null = null;
    for (let s = 0; s <= currentIndex; s++) {
      const newStatus = statusesOrder[s];
      await prisma.incidentStatusHistory.create({
        data: {
          incidentId: incident.id,
          oldStatus: prev,
          newStatus,
          createdAt: new Date(createdAt.getTime() + s * 7200000),
        },
      });
      prev = newStatus;
    }
  }

  console.log(`Seeded ${users.length} users and ${totalIncidents} incidents.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
