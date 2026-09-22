import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGIONS = [
  "منطقه ۱", "منطقه ۳", "منطقه ۵", "منطقه ۶", "منطقه ۷", "منطقه ۸", "منطقه ۱۰",
  "منطقه ۱۲", "منطقه ۱۴", "منطقه ۱۵", "منطقه ۱۷", "منطقه ۱۹", "منطقه ۲۰", "منطقه ۲۲",
];
const STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED"] as const;
const COLORS: Record<string, string> = {
  Low: "Green", Medium: "Yellow", High: "Orange", Critical: "Red",
};
const IMAGE_IDS = [3822622, 3823032, 361104, 280193, 280165, 2614818, 248537];

const INCIDENT_TEMPLATES = [
  { type: "نشتی گاز", desc: "بوی گاز شدیدی از لوله بیرون می‌آید. خطرناک است.", agencies: ["گاز", "آتش نشانی", "اورژانس"], sev: "Critical" },
  { type: "حریق", desc: "آتش در یک ساختمان مسکونی گرفته و دود زیادی تولید می‌کند.", agencies: ["آتش نشانی", "اورژانس", "پلیس"], sev: "Critical" },
  { type: "تصادف", desc: "تصادف بین دو خودرو در تقاطع رخ داده و مسیر مسدود شده است.", agencies: ["پلیس", "اورژانس"], sev: "High" },
  { type: "خرابی آسفالت", desc: "چاله عمیقی در وسط خیابان ایجاد شده و خطر تصادف دارد.", agencies: ["شهرداری"], sev: "Medium" },
  { type: "مشکل آب و فاضلاب", desc: "لوله آب ترکیده و آب در خیابان جاری است.", agencies: ["آب و فاضلاب", "شهرداری"], sev: "High" },
  { type: "مشکل برق", desc: "سیم برق قطع شده و روی زمین افتاده است.", agencies: ["اداره برق", "شهرداری"], sev: "High" },
  { type: "مشکل پسماند", desc: "زباله‌ها در خیابان انباشته شده و بوی بدی تولید می‌کنند.", agencies: ["شهرداری"], sev: "Low" },
  { type: "خرابی چراغ", desc: "چراغ خیابان سه روز است روشن نمی‌شود.", agencies: ["شهرداری", "اداره برق"], sev: "Low" },
  { type: "خطر درخت", desc: "شاخه بزرگ درخت روی جاده افتاده و مسیر را بسته است.", agencies: ["شهرداری", "اورژانس"], sev: "Medium" },
  { type: "سرقت", desc: "سرقت از یک مغازه گزارش شده و مجرم فرار کرده است.", agencies: ["پلیس", "نهادهای امنیتی"], sev: "Medium" },
];

const OPERATOR_DATA = [
  ["علی رضایی", "09121001001", "M-1001", "شهرداری", "خودروی خدمات شهری ۴۲"],
  ["مهدی محمدی", "09121001002", "M-1002", "شهرداری", "خودروی خدمات شهری ۱۸"],
  ["رضا احمدی", "09121002001", "F-2001", "آتش نشانی", "خودروی عملیاتی ۱۲"],
  ["حسین اکبری", "09121002002", "F-2002", "آتش نشانی", "خودروی عملیاتی ۷"],
  ["محمد کریمی", "09121003001", "P-3001", "پلیس", "واحد گشت ۲۱"],
  ["سعید مرادی", "09121003002", "P-3002", "پلیس", "موتورسیکلت گشت ۹"],
  ["امیر نادری", "09121004001", "E-4001", "اورژانس", "آمبولانس ۱۱۵-۳۲"],
  ["سینا حسینی", "09121004002", "E-4002", "اورژانس", "آمبولانس ۱۱۵-۱۷"],
  ["مجید توکلی", "09121005001", "W-5001", "آب و فاضلاب", "خودروی تعمیرات ۸"],
  ["نوید صادقی", "09121006001", "EL-6001", "اداره برق", "بالابر عملیاتی ۵"],
  ["کیوان رستمی", "09121007001", "G-7001", "گاز", "خودروی امداد گاز ۱۴"],
  ["میلاد جعفری", "09121008001", "S-8001", "نهادهای امنیتی", "خودروی سازمانی"],
] as const;

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomFloat(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomDate(daysBack: number) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date;
}

async function main() {
  console.log("Seeding database...");
  await prisma.incidentStatusHistory.deleteMany();
  await prisma.incidentAgency.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({ data: { name: "مدیر سیستم", phone: "09120000001", role: "ADMIN" } }),
    prisma.user.create({ data: { name: "علی رضایی", phone: "09120000002", role: "CITIZEN" } }),
    prisma.user.create({ data: { name: "مریم احمدی", phone: "09120000003", role: "CITIZEN" } }),
    prisma.user.create({ data: { name: "اپراتور شهرداری", phone: "09120000004", role: "AGENCY", agency: "شهرداری" } }),
    prisma.user.create({ data: { name: "اپراتور آتش نشانی", phone: "09120000005", role: "AGENCY", agency: "آتش نشانی" } }),
  ]);
  const citizens = users.filter((user) => user.role === "CITIZEN");

  const operators = await Promise.all(
    OPERATOR_DATA.map(([name, phone, personnelCode, agency, vehicle]) =>
      prisma.operator.create({ data: { name, phone, personnelCode, agency, vehicle } }),
    ),
  );

  for (let index = 0; index < 30; index += 1) {
    const template = randomItem(INCIDENT_TEMPLATES);
    const reporter = randomItem(citizens);
    const region = randomItem(REGIONS);
    const status = randomItem(STATUSES);
    const createdAt = randomDate(30);
    const imageId = randomItem(IMAGE_IDS);
    const matchingOperators = operators.filter((operator) => template.agencies.includes(operator.agency));
    const assignedOperator =
      status !== "PENDING" && matchingOperators.length > 0 && index % 4 === 0
        ? matchingOperators[index % matchingOperators.length]
        : null;

    const incident = await prisma.incident.create({
      data: {
        incidentNumber: `INC-${String(1000 + index).padStart(4, "0")}`,
        reporterId: reporter.id,
        assignedOperatorId: assignedOperator?.id,
        assignedAt: assignedOperator ? new Date(createdAt.getTime() + 30 * 60 * 1000) : null,
        imageUrl: `https://images.pexels.com/photos/${imageId}/pexels-photo-${imageId}.jpeg?auto=compress&cs=tinysrgb&w=600`,
        description: template.desc,
        latitude: randomFloat(35.55, 35.82),
        longitude: randomFloat(51.2, 51.6),
        region,
        incidentType: template.type,
        severity: template.sev,
        colorCode: COLORS[template.sev],
        aiSummary: `تحلیل خودکار: ${template.type} در ${region}. ${template.desc}`,
        status,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
      },
    });

    for (const agencyName of template.agencies) {
      await prisma.incidentAgency.create({
        data: { incidentId: incident.id, agencyName, assignedAt: createdAt },
      });
    }

    const statusOrder = ["PENDING", "IN_PROGRESS", "RESOLVED"];
    const currentIndex = statusOrder.indexOf(status);
    for (let statusIndex = 0; statusIndex <= currentIndex; statusIndex += 1) {
      await prisma.incidentStatusHistory.create({
        data: {
          incidentId: incident.id,
          oldStatus: statusIndex === 0 ? null : statusOrder[statusIndex - 1],
          newStatus: statusOrder[statusIndex],
          createdAt: new Date(createdAt.getTime() + statusIndex * 2 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log(`Seeded ${users.length} users, ${operators.length} operators and 30 incidents.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
