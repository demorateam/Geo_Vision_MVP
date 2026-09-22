const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalize(value = "") {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .trim()
    .toLowerCase();
}

function detectAgencies(incident) {
  const text = normalize(
    `${incident.incidentType} ${incident.description}`
  );

  if (text.includes("گاز") || text.includes("نشتی")) {
    return ["گاز", "آتش نشانی", "اورژانس"];
  }

  if (
    text.includes("حریق") ||
    text.includes("آتش") ||
    text.includes("دود")
  ) {
    return ["آتش نشانی", "اورژانس", "پلیس"];
  }

  if (
    text.includes("تصادف") ||
    text.includes("خودرو") ||
    text.includes("برخورد")
  ) {
    return ["پلیس", "اورژانس"];
  }

  if (
    text.includes("آب") ||
    text.includes("فاضلاب") ||
    text.includes("ترکیدگی لوله")
  ) {
    return ["آب و فاضلاب", "شهرداری"];
  }

  if (
    text.includes("برق") ||
    text.includes("سیم") ||
    text.includes("چراغ")
  ) {
    return ["اداره برق", "شهرداری"];
  }

  if (
    text.includes("سرقت") ||
    text.includes("دزدی")
  ) {
    return ["پلیس", "نهادهای امنیتی"];
  }

  if (
    text.includes("درخت") ||
    text.includes("پسماند") ||
    text.includes("زباله") ||
    text.includes("آسفالت") ||
    text.includes("چاله") ||
    text.includes("مشکل عمومی شهری")
  ) {
    return ["شهرداری"];
  }

  // fallback نهایی برای MVP
  return ["شهرداری"];
}

async function main() {
  const incidents = await prisma.incident.findMany({
    where: {
      agencies: {
        none: {}
      }
    },
    include: {
      agencies: true
    }
  });

  console.log(`${incidents.length} رخداد بدون سازمان پیدا شد.`);

  for (const incident of incidents) {
    const agencies = detectAgencies(incident);

    for (const agencyName of agencies) {
      await prisma.incidentAgency.create({
        data: {
          incidentId: incident.id,
          agencyName
        }
      });
    }

    console.log(
      `${incident.incidentNumber} -> ${agencies.join("، ")}`
    );
  }

  console.log("ترمیم سازمان‌های مسئول با موفقیت انجام شد.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
