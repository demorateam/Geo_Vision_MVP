/**
 * GeoVision AI Assistant — توصیف ساختار دیتابیس برای LLM
 *
 * این متن بر اساس schema واقعی Prisma پروژه و مقادیر واقعی prisma/seed.ts
 * تهیه شده است. هیچ اطلاعات حساسی (کلید، هش، نمونه داده کاربران) در آن نیست.
 *
 * ⚠️ نکته حیاتی (با آزمون واقعی روی Prisma 5.22 تأیید شده):
 * Prisma مقادیر DateTime را در SQLite به‌صورت «Unix Epoch میلی‌ثانیه»
 * (INTEGER، UTC) ذخیره می‌کند — نه رشته ISO. بنابراین مقایسه تاریخ باید
 * عددی باشد و datetime(createdAt) بدون تقسیم بر 1000 نتیجه غلط می‌دهد.
 */

export const SCHEMA_CONTEXT = String.raw`
## ساختار دیتابیس GeoVision (SQLite از طریق Prisma)

### قواعد حیاتی نوع داده (اغلاع نکنید!)
- همه ستون‌های DateTime به‌صورت «Unix Epoch بر حسب میلی‌ثانیه» (عدد صحیح، UTC) ذخیره می‌شوند.
- مقایسه بازه تاریخ: فقط مقایسه عددی با ثابت‌های ms که در پرامپت داده می‌شود:
  WHERE createdAt >= 1758621600000 AND createdAt < 1758708000000
- فاصله زمانی بین دو تاریخ = تفاضل دو عدد (میلی‌ثانیه):
  / 86400000.0 = روز   |   / 3600000.0 = ساعت   |   / 60000.0 = دقیقه
- نمایش خوانای تاریخ در خروجی (فقط در صورت نیاز): datetime(createdAt/1000, 'unixepoch')
- هرگز datetime(createdAt) یا julianday(createdAt) را بدون تقسیم بر 1000 استفاده نکنید — نتیجه کاملاً غلط است.
- مقادیر Boolean (مثل isActive) به‌صورت 0/1 ذخیره می‌شوند.
- متن‌ها فارسی هستند؛ برای جستجوی نام/متن از LIKE با پارامتر استفاده کنید: name LIKE ?  با پارامتر '%علی%'
- مقادیر enum به همان شکل انگلیسی/دقیق زیر نوشته می‌شوند (حساس به بزرگی/کوچکی حروف).

### جدول User — کاربران و شهروندان گزارش‌دهنده
- id TEXT (کلید اصلی)
- name TEXT (نام کامل، فارسی)
- phone TEXT (شماره موبایل یکتا)
- role TEXT یکی از: 'CITIZEN' | 'ADMIN' | 'AGENCY'
- agency TEXT (فقط وقتی role='AGENCY' پر می‌شود؛ نام سازمان)
- createdAt (DateTime)، incidents: رابطه به Incident.reporterId

### جدول Operator — اپراتورهای میدانی
- id TEXT (کلید اصلی)
- name TEXT (نام کامل فارسی)
- phone TEXT
- personnelCode TEXT (کد پرسنلی یکتا، مثل 'M-1001')
- agency TEXT یکی از: 'شهرداری' | 'آتش نشانی' | 'پلیس' | 'اورژانس' | 'آب و فاضلاب' | 'اداره برق' | 'گاز' | 'نهادهای امنیتی'
- status TEXT (وضعیت شیفت؛ مقدار پیش‌فرض 'AVAILABLE')
- vehicle TEXT (خودروی عملیاتی، مثل 'خودروی خدمات شهری ۴۲')
- isActive INTEGER (0/1)
- lastLoginAt (DateTime، ممکن است NULL)
- createdAt (DateTime)
- incidents: رابطه به Incident.assignedOperatorId

### جدول Incident — رخدادها (جدول اصلی و پرکاربرد)
- id TEXT (کلید اصلی)
- incidentNumber TEXT (شماره یکتا، مثل 'INC-1001')
- reporterId TEXT (FK به User.id — شهروند گزارش‌دهنده)
- assignedOperatorId TEXT (FK به Operator.id؛ NULL یعنی هنوز به اپراتور تخصیص نیافته)
- imageUrl TEXT، description TEXT (متن فارسی)، aiSummary TEXT (خلاصه هوش مصنوعی، ممکن است NULL)
- latitude REAL، longitude REAL، address TEXT
- region TEXT دقیقاً یکی از این ۱۴ مقدار (با ارقام فارسی):
  'منطقه ۱','منطقه ۳','منطقه ۵','منطقه ۶','منطقه ۷','منطقه ۸','منطقه ۱۰','منطقه ۱۲','منطقه ۱۴','منطقه ۱۵','منطقه ۱۷','منطقه ۱۹','منطقه ۲۰','منطقه ۲۲'
- incidentType TEXT دقیقاً یکی از:
  'نشتی گاز','حریق','تصادف','خرابی آسفالت','مشکل آب و فاضلاب','مشکل برق','مشکل پسماند','خرابی چراغ','خطر درخت','سرقت'
- severity TEXT دقیقاً یکی از: 'Low' | 'Medium' | 'High' | 'Critical'
- colorCode TEXT معادل رنگی severity: 'Green' | 'Yellow' | 'Orange' | 'Red'
- status TEXT دقیقاً یکی از: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'
- operatorStatus TEXT (یادداشت وضعیت اپراتور، ممکن است NULL)
- زمان‌ها: createdAt، updatedAt، assignedAt، acceptedAt، enRouteAt، arrivedAt، workStartedAt، completedAt
  (به‌جز createdAt و updatedAt بقیه ممکن است NULL باشند)
- completionNote TEXT

#### مفاهیم/domain کلیدی جدول Incident:
- «رخداد بسته‌شده / حل‌شده / پایان‌یافته / تکمیل‌شده» = status = 'RESOLVED'
- «رخداد فعال / در جریان» = status IN ('PENDING','IN_PROGRESS')
- «رخداد بحرانی / فوری / پرخطر» = severity = 'Critical'
- «رخداد تخصیص‌یافته» = assignedOperatorId IS NOT NULL
- «زمان رسیدگی/پاسخ‌دهی» = فاصله createdAt رخداد تا زمان ثبت وضعیت 'RESOLVED' در IncidentStatusHistory
  (از این مسیر برو؛ چون completedAt در داده‌ها ممکن است NULL باشد)
- «امروز» یعنی بازه از ابتدای روز جاری تهران — مقدار دقیق ms آن در پرامپت داده نمی‌شود؛
  در عوض اگر سؤال «امروز» بود، بازه «ماه جاری شمسی» را جایگزین نکن؛ سؤال تکمیلی (CLARIFICATION) بپرس یا
  از ابتدای ماه جاری استفاده کن و در توضیح ذکر کن. (اولویت: پرسیدن سؤال تکمیلی)

### جدول IncidentAgency — سازمان‌های دخیل در هر رخداد
- id TEXT (کلید اصلی)
- incidentId TEXT (FK به Incident.id)
- agencyName TEXT (همان لیست سازمان‌های جدول Operator)
- assignedAt (DateTime)

### جدول IncidentStatusHistory — تاریخچه تغییر وضعیت رخدادها
- id TEXT (کلید اصلی)
- incidentId TEXT (FK به Incident.id)
- oldStatus TEXT (NULL برای اولین وضعیت) ، newStatus TEXT (یکی از مقادیر status)
- createdAt (DateTime — زمان ثبت آن تغییر وضعیت)

### روابط (JOIN keys):
- Incident.reporterId = User.id
- Incident.assignedOperatorId = Operator.id
- IncidentAgency.incidentId = Incident.id
- IncidentStatusHistory.incidentId = Incident.id

### راهنمای متریک‌های «عملکرد اپراتور» (وقتی کاربر دقیق نگفته، ابتدا سؤال تکمیلی بپرسید):
1) تعداد رخدادهای بسته‌شده: COUNT از Incident WHERE assignedOperatorId = op AND status = 'RESOLVED'
2) میانگین زمان رسیدگی: AVG((h.createdAt - i.createdAt) / 3600000.0) — JOIN
   Incident i با IncidentStatusHistory h ON h.incidentId = i.id WHERE h.newStatus = 'RESOLVED'
   و اگر اپراتور هم شرط است: i.assignedOperatorId = op (نتیجه بر حسب ساعت)
3) نرخ حل (درصد بسته‌شده): رخدادهای RESOLVED تقسیم بر کل رخدادهای تخصیص‌یافته همان اپراتور × 100
4) تعداد کل رخدادهای تخصیص‌یافته: COUNT WHERE assignedOperatorId = op

### راهنمای متریک‌های «عملکرد سازمان/منطقه»:
- سازمان‌ها هم در Operator.agency و هم در IncidentAgency.agencyName هستند؛
  برای «رخدادهای هر سازمان» از IncidentAgency (سازمان‌های دخیل) و برای «کار اپراتورهای سازمان» از Operator استفاده کنید.
`;
