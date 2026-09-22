const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const prisma = new PrismaClient();

const operators = [
  ["علی محمدی", "09121009001", "M-9001", "شهرداری", "خودروی خدمات شهری ۱"],
  ["رضا حسینی", "09121009002", "M-9002", "شهرداری", "خودروی خدمات شهری ۲"],
  ["مهدی کریمی", "09121009003", "M-9003", "شهرداری", "موتورسیکلت عملیاتی ۳"],
  ["حسین احمدی", "09121009004", "M-9004", "شهرداری", "خودروی خدمات شهری ۴"],
  ["سعید رضایی", "09121009005", "M-9005", "شهرداری", "خودروی خدمات شهری ۵"],
  ["امیر مرادی", "09121009006", "M-9006", "شهرداری", "موتورسیکلت عملیاتی ۶"],
  ["محمد اکبری", "09121009007", "M-9007", "شهرداری", "خودروی خدمات شهری ۷"],
  ["سینا توکلی", "09121009008", "M-9008", "شهرداری", "خودروی خدمات شهری ۸"],
  ["مجید نادری", "09121009101", "W-9101", "آب و فاضلاب", "خودروی تعمیرات آب ۱"],
  ["نوید صادقی", "09121009102", "W-9102", "آب و فاضلاب", "خودروی تعمیرات آب ۲"],
  [
    "کیوان رستمی",
    "09121009103",
    "W-9103",
    "آب و فاضلاب",
    "خودروی امداد فاضلاب ۳",
  ],
  ["محمد جعفری", "09121009201", "P-9201", "پلیس", "خودروی گشت ۱"],
  ["میلاد نظری", "09121009202", "P-9202", "پلیس", "خودروی گشت ۲"],
  ["رضا قربانی", "09121009203", "P-9203", "پلیس", "موتورسیکلت گشت ۳"],
  ["حامد رحیمی", "09121009204", "P-9204", "پلیس", "خودروی گشت ۴"],
];

function credentials(personnelCode) {
  const pin = personnelCode.slice(-4);
  const pinSalt = randomBytes(16).toString("hex");
  const pinHash = scryptSync(pin, pinSalt, 64).toString("hex");
  return { pin, pinSalt, pinHash };
}

async function main() {
  const result = [];
  for (const [name, phone, personnelCode, agency, vehicle] of operators) {
    const { pin, pinSalt, pinHash } = credentials(personnelCode);
    await prisma.operator.upsert({
      where: { personnelCode },
      update: {
        name,
        phone,
        agency,
        vehicle,
        status: "AVAILABLE",
        isActive: true,
        pinSalt,
        pinHash,
      },
      create: {
        name,
        phone,
        personnelCode,
        agency,
        vehicle,
        status: "AVAILABLE",
        isActive: true,
        pinSalt,
        pinHash,
      },
    });
    result.push({ name, agency, personnelCode, pin });
  }
  console.table(result);
  console.log(`${result.length} حساب مأمور با رمز چهاررقمی آماده شد.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
