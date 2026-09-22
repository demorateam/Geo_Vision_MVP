const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const operators = [
  // شهرداری ـ ۸ نفر
  {
    name: "علی محمدی",
    phone: "09121009001",
    personnelCode: "M-9001",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "خودروی خدمات شهری ۱"
  },
  {
    name: "رضا حسینی",
    phone: "09121009002",
    personnelCode: "M-9002",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "خودروی خدمات شهری ۲"
  },
  {
    name: "مهدی کریمی",
    phone: "09121009003",
    personnelCode: "M-9003",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "موتورسیکلت عملیاتی ۳"
  },
  {
    name: "حسین احمدی",
    phone: "09121009004",
    personnelCode: "M-9004",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "خودروی خدمات شهری ۴"
  },
  {
    name: "سعید رضایی",
    phone: "09121009005",
    personnelCode: "M-9005",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "خودروی خدمات شهری ۵"
  },
  {
    name: "امیر مرادی",
    phone: "09121009006",
    personnelCode: "M-9006",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "موتورسیکلت عملیاتی ۶"
  },
  {
    name: "محمد اکبری",
    phone: "09121009007",
    personnelCode: "M-9007",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "خودروی خدمات شهری ۷"
  },
  {
    name: "سینا توکلی",
    phone: "09121009008",
    personnelCode: "M-9008",
    agency: "شهرداری",
    status: "AVAILABLE",
    vehicle: "خودروی خدمات شهری ۸"
  },

  // آب و فاضلاب ـ ۳ نفر
  {
    name: "مجید نادری",
    phone: "09121009101",
    personnelCode: "W-9101",
    agency: "آب و فاضلاب",
    status: "AVAILABLE",
    vehicle: "خودروی تعمیرات آب ۱"
  },
  {
    name: "نوید صادقی",
    phone: "09121009102",
    personnelCode: "W-9102",
    agency: "آب و فاضلاب",
    status: "AVAILABLE",
    vehicle: "خودروی تعمیرات آب ۲"
  },
  {
    name: "کیوان رستمی",
    phone: "09121009103",
    personnelCode: "W-9103",
    agency: "آب و فاضلاب",
    status: "AVAILABLE",
    vehicle: "خودروی امداد فاضلاب ۳"
  },

  // پلیس ـ ۴ نفر
  {
    name: "محمد جعفری",
    phone: "09121009201",
    personnelCode: "P-9201",
    agency: "پلیس",
    status: "AVAILABLE",
    vehicle: "خودروی گشت ۱"
  },
  {
    name: "میلاد نظری",
    phone: "09121009202",
    personnelCode: "P-9202",
    agency: "پلیس",
    status: "AVAILABLE",
    vehicle: "خودروی گشت ۲"
  },
  {
    name: "رضا قربانی",
    phone: "09121009203",
    personnelCode: "P-9203",
    agency: "پلیس",
    status: "AVAILABLE",
    vehicle: "موتورسیکلت گشت ۳"
  },
  {
    name: "حامد رحیمی",
    phone: "09121009204",
    personnelCode: "P-9204",
    agency: "پلیس",
    status: "AVAILABLE",
    vehicle: "خودروی گشت ۴"
  }
];

async function main() {
  for (const operator of operators) {
    await prisma.operator.upsert({
      where: {
        personnelCode: operator.personnelCode
      },
      update: operator,
      create: operator
    });
  }

  console.log(`${operators.length} اپراتور آزمایشی با موفقیت ثبت شد.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
