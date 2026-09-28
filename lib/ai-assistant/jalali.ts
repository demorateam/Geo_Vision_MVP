/**
 * GeoVision AI Assistant — ابزار تبدیل تاریخ شمسی/میلادی
 *
 * ساخت ثابت‌های زمانی دقیق (ابتدا/انتهای ماه شمسی و میلادی) برای تزریق به
 * System Prompt دستیار هوشمند، تا LLM هرگز مجبور به «حدس زدن» یا «تبدیل تاریخ»
 * نشود و فقط از ثابت‌های آماده استفاده کند.
 *
 * نکته دیتابیس: Prisma مقادیر DateTime را در SQLite به‌صورت Unix Epoch
 * میلی‌ثانیه (INTEGER، بر مبنای UTC) ذخیره می‌کند؛ بنابراین مرزهای زمانی به
 * صورت ms ارائه می‌شوند تا در SQL مستقیماً مقایسه عددی شوند.
 *
 * منطقه زمانی مرجع: Asia/Tehran (UTC+03:30 — ایران از ۱۴۰۱ ساعت تابستانی ندارد)
 */

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000; // UTC+03:30

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const GREGORIAN_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

// ---------------------------------------------------------------------------
// تبدیل تقویم جلالی (الگوریتم استاندارد jalaali) — خالص و بدون وابستگی
// ---------------------------------------------------------------------------

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error(`سال شمسی نامعتبر: ${jy}`);
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function toJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 0 ? 30 : 29; // اسفند در سال کبیسه ۳۰ روزه است
}

// ---------------------------------------------------------------------------
// منطقه زمانی تهران
// ---------------------------------------------------------------------------

function tehranDateParts(now: Date): { gy: number; gm: number; gd: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { gy: get("year"), gm: get("month"), gd: get("day") };
}

/** نیمه‌شب تهران برای تاریخ میلادی داده‌شده، به‌صورت Date (UTC) */
function tehranMidnightUtc(gy: number, gm: number, gd: number): Date {
  return new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0) - TEHRAN_OFFSET_MS);
}

// ---------------------------------------------------------------------------
// ساخت Context زمانی برای Prompt
// ---------------------------------------------------------------------------

export interface DateRange {
  /** برچسب فارسی خوانا */
  label: string;
  /** شروع بازه — ISO UTC خوانا */
  startISO: string;
  /** پایان بازه (انحصاری) — ISO UTC خوانا */
  endISO: string;
  /** شروع بازه بر حسب میلی‌ثانیه epoch — برای مقایسه مستقیم در SQL */
  startMs: number;
  /** پایان بازه (انحصاری) بر حسب میلی‌ثانیه epoch */
  endMs: number;
}

export interface DateContext {
  nowISO: string;
  nowTehran: string;
  jalaliToday: string;
  /** ماه جاری شمسی */
  jCurrent: DateRange;
  /** ماه گذشته شمسی */
  jPrev: DateRange;
  /** ماه جاری میلادی */
  gCurrent: DateRange;
  /** ماه گذشته میلادی */
  gPrev: DateRange;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function jalaliRange(jy: number, jm: number, label: string): DateRange {
  const startG = toGregorian(jy, jm, 1);
  const nextJm = jm < 12 ? jm + 1 : 1;
  const nextJy = jm < 12 ? jy : jy + 1;
  const endG = toGregorian(nextJy, nextJm, 1);
  const startMs = tehranMidnightUtc(startG.gy, startG.gm, startG.gd).getTime();
  const endMs = tehranMidnightUtc(endG.gy, endG.gm, endG.gd).getTime();
  return { label, startISO: iso(startMs), endISO: iso(endMs), startMs, endMs };
}

function gregorianRange(gy: number, gm: number, label: string): DateRange {
  const startMs = tehranMidnightUtc(gy, gm, 1).getTime();
  const nextGm = gm < 12 ? gm + 1 : 1;
  const nextGy = gm < 12 ? gy : gy + 1;
  const endMs = tehranMidnightUtc(nextGy, nextGm, 1).getTime();
  return { label, startISO: iso(startMs), endISO: iso(endMs), startMs, endMs };
}

export function buildDateContext(now: Date = new Date()): DateContext {
  const { gy, gm, gd } = tehranDateParts(now);
  const j = toJalali(gy, gm, gd);

  const prevJm = j.jm > 1 ? j.jm - 1 : 12;
  const prevJy = j.jm > 1 ? j.jy : j.jy - 1;

  const prevGm = gm > 1 ? gm - 1 : 12;
  const prevGy = gm > 1 ? gy : gy - 1;

  const nowTehran = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "full",
    timeStyle: "short",
  }).format(now);

  return {
    nowISO: now.toISOString(),
    nowTehran,
    jalaliToday: `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`,
    jCurrent: jalaliRange(j.jy, j.jm, `ماه جاری شمسی (${JALALI_MONTHS[j.jm - 1]} ${j.jy})`),
    jPrev: jalaliRange(prevJy, prevJm, `ماه گذشته شمسی (${JALALI_MONTHS[prevJm - 1]} ${prevJy})`),
    gCurrent: gregorianRange(gy, gm, `ماه جاری میلادی (${GREGORIAN_MONTHS[gm - 1]} ${gy})`),
    gPrev: gregorianRange(prevGy, prevGm, `ماه گذشته میلادی (${GREGORIAN_MONTHS[prevGm - 1]} ${prevGy})`),
  };
}
