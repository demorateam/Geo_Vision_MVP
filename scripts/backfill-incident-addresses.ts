import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const apiKey = process.env.NESHAN_API_KEY;
  if (!apiKey) {
    console.error("NESHAN_API_KEY تنظیم نشده است");
    return null;
  }
  try {
    const url = `https://api.neshan.org/v5/reverse?lat=${latitude}&lng=${longitude}`;
    const response = await fetch(url, { headers: { "Api-Key": apiKey } });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.formatted_address === "string" && data.formatted_address
      ? (data.formatted_address as string)
      : null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const incidents = await prisma.incident.findMany({
    where: { address: null },
    select: { id: true, latitude: true, longitude: true, incidentNumber: true },
  });

  console.log(`تعداد رخداد بدون آدرس: ${incidents.length}`);

  let success = 0;
  let failed = 0;

  for (const incident of incidents) {
    const address = await reverseGeocode(incident.latitude, incident.longitude);

    if (address) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: { address },
      });
      success++;
      console.log(`✔ ${incident.incidentNumber}: ${address}`);
    } else {
      failed++;
      console.log(`✘ ${incident.incidentNumber}: آدرس پیدا نشد`);
    }

    // فاصله بین درخواست‌ها برای جلوگیری از rate limit
    await sleep(300);
  }

  console.log(`\nپایان: ${success} موفق، ${failed} ناموفق`);
}

main()
  .catch((error) => {
    console.error("خطای کلی اسکریپت:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });