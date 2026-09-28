/**
 * GeoVision AI Assistant — لایه اعتبارسنجی و ایمن‌سازی SQL (Safety Layer)
 *
 * کاملاً دترمینیستیک (بدون LLM) — آخرین و مطمئن‌ترین دیوار امنیتی قبل از اجرا.
 * خروجی LLM بدون عبور از این لایه هرگز به دیتابیس نمی‌رسد.
 *
 * قواعد:
 *  - فقط SELECT تک‌statement (بدون WITH/CTE، بدون کامنت، بدون quoted identifier)
 *  - فقط جداول مجاز پروژه (whitelist)
 *  - SELECT * و table.* ممنوع (جلوگیری از افشای ستون‌های حساس مثل pinHash)
 *  - ستون‌های حساس ممنوع
 *  - متن‌های داخل رشته‌های SQL در بررسی کلمات ممنوعه «ماسک» می‌شوند تا false positive نداشته باشیم
 *  - LIMIT اجباری + سقف ردیف
 *  - پارامترها فقط با ? bind می‌شوند؛ تعداد پارامترها باید دقیقاً برابر تعداد ? باشد
 */

export const MAX_ROWS = 500;
export const MAX_LLM_ROWS = 50; // حداکثر ردیف‌هایی که برای روایت به LLM برمی‌گردد

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const MAX_SQL_LENGTH = 2000;
const MAX_PARAMS = 30;
const MAX_LITERAL_LENGTH = 300;
const MAX_LITERALS = 20;

/** جداول مجاز — دقیقاً منطبق بر schema.prisma پروژه */
const ALLOWED_TABLES = new Set([
  "user",
  "operator",
  "incident",
  "incidentagency",
  "incidentstatushistory",
]);

/** ستون‌های حساس که هرگز نباید در نتیجه ظاهر شوند */
const FORBIDDEN_COLUMNS = /\b(pinHash|pinSalt)\b/i;

/** کلمات/توابع ممنوعه (روی SQL ماسک‌شده بررسی می‌شود) */
const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|truncate|attach|detach|pragma|vacuum|reindex|replace|grant|revoke|begin|commit|end|rollback|savepoint|release|explain|analyze|with|load_extension|randomblob|zeroblob|sqlite_\w*|writefile|readfile)\b/i;

export type SqlParameter = string | number | null;

export type SqlValidationResult =
  | { ok: true; sql: string; params: SqlParameter[] }
  | { ok: false; reason: string };

interface SqlScan {
  literals: string[];
  questionMarks: number;
}

/**
 * یک پاس دقیق روی کاراکترهای SQL:
 *  - محتوای رشته‌های 'single quoted' را جمع می‌کند (با پشتیبانی escape '' )
 *  - تعداد ? های بیرون از رشته‌ها را می‌شمارد
 */
function scanSql(sql: string): SqlScan {
  const literals: string[] = [];
  let questionMarks = 0;
  let current: string | null = null;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (current !== null) {
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          current += "'";
          i += 1;
        } else {
          literals.push(current);
          current = null;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'") {
      current = "";
      continue;
    }
    if (ch === "?") questionMarks += 1;
  }
  // اگر رشته بسته‌نشده باقی بماند در مرحله بعد رد می‌شود (تعداد quotes فرد)
  return { literals, questionMarks };
}

/** جایگزینی محتوای رشته‌ها با placeholder تا بررسی‌ها روی «ساختار» SQL انجام شود */
function maskLiterals(sql: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (inString) {
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          i += 1; // escape شده
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      out += "''"; // placeholder
      continue;
    }
    out += ch;
  }
  return out;
}

function countChar(sql: string, ch: string): number {
  let n = 0;
  for (const c of sql) if (c === ch) n += 1;
  return n;
}

/**
 * اعتبارسنجی و نرمال‌سازی کوئری تولیدی LLM.
 * در صورت موفقیت، کوئریِ نهایی (با LIMIT تزریق‌شده/کلمپ‌شده) و پارامترهای نرمال‌شده برمی‌گردد.
 */
export function validateAndNormalizeSql(
  rawSql: unknown,
  rawParams: unknown,
): SqlValidationResult {
  if (typeof rawSql !== "string" || rawSql.trim().length === 0) {
    return { ok: false, reason: "کوئری خالی است یا از نوع نامعتبر است." };
  }

  let sql = rawSql.trim();
  if (sql.includes("\u0000")) {
    return { ok: false, reason: "کاراکتر نامعتبر در کوئری." };
  }
  if (sql.length > MAX_SQL_LENGTH) {
    return { ok: false, reason: `کوئری بیش از حد طولانی است (حداکثر ${MAX_SQL_LENGTH} کاراکتر).` };
  }

  // فقط یک statement — نقطه‌ویرگول انتهایی حذف، بقیه ممنوع
  while (sql.endsWith(";")) sql = sql.slice(0, -1).trimEnd();
  if (sql.includes(";")) {
    return { ok: false, reason: "چند statement در یک کوئری مجاز نیست." };
  }

  const scan = scanSql(sql);
  const singleQuotes = countChar(sql, "'");
  if (singleQuotes % 2 !== 0) {
    return { ok: false, reason: "کوئری شامل رشته نامعتبر (quote بسته‌نشده) است." };
  }

  const params: SqlParameter[] = [];
  if (rawParams !== undefined && rawParams !== null) {
    if (!Array.isArray(rawParams)) {
      return { ok: false, reason: "params باید آرایه باشد." };
    }
    if (rawParams.length > MAX_PARAMS) {
      return { ok: false, reason: `تعداد پارامترها بیش از حد مجاز است (حداکثر ${MAX_PARAMS}).` };
    }
    for (const p of rawParams) {
      if (p === null) {
        params.push(null);
      } else if (typeof p === "number") {
        if (!Number.isFinite(p)) return { ok: false, reason: "پارامتر عددی نامعتبر است." };
        params.push(p);
      } else if (typeof p === "string") {
        if (p.length > MAX_LITERAL_LENGTH) {
          return { ok: false, reason: `پارامتر متنی بیش از حد طولانی است (حداکثر ${MAX_LITERAL_LENGTH}).` };
        }
        params.push(p);
      } else if (typeof p === "boolean") {
        params.push(p ? 1 : 0); // SQLite: boolean → 0/1
      } else {
        return { ok: false, reason: "پارامترها فقط می‌توانند رشته، عدد یا null باشند." };
      }
    }
  }

  if (scan.questionMarks !== params.length) {
    return {
      ok: false,
      reason: `تعداد placeholder های ? (${scan.questionMarks}) با تعداد پارامترها (${params.length}) برابر نیست.`,
    };
  }

  if (scan.literals.length > MAX_LITERALS) {
    return { ok: false, reason: `تعداد مقادیر literal داخل کوئری بیش از حد مجاز است (حداکثر ${MAX_LITERALS}).` };
  }
  for (const lit of scan.literals) {
    if (lit.length > MAX_LITERAL_LENGTH) {
      return { ok: false, reason: "یکی از مقادیر متنی داخل کوئری بیش از حد طولانی است." };
    }
  }

  const masked = maskLiterals(sql);

  // ساختار ممنوعه — روی نسخه ماسک‌شده (بدون محتوای رشته‌ها)
  if (masked.includes("--") || masked.includes("/*") || masked.includes("*/")) {
    return { ok: false, reason: "کامنت در SQL مجاز نیست." };
  }
  if (/["`[\]]/.test(masked)) {
    return { ok: false, reason: "شناسه‌های کوتیشن‌دار (double quote / backtick / bracket) مجاز نیستند." };
  }
  if (!/^select\b/i.test(masked.trim())) {
    return { ok: false, reason: "فقط کوئری‌های SELECT مجاز هستند." };
  }
  const keywordMatch = masked.match(FORBIDDEN_KEYWORDS);
  if (keywordMatch) {
    return { ok: false, reason: `استفاده از «${keywordMatch[0]}» در کوئری مجاز نیست.` };
  }
  if (FORBIDDEN_COLUMNS.test(masked)) {
    return { ok: false, reason: "ستون‌های حساس (credentials) قابل دسترسی نیستند." };
  }
  // SELECT * / DISTINCT * / , *  و  table.*  ممنوع — COUNT(*) مجاز است
  if (/(?:\bselect\b|\bdistinct\b|,)\s*\*/i.test(masked) || /\.\s*\*/.test(masked)) {
    return {
      ok: false,
      reason: "SELECT * مجاز نیست؛ ستون‌ها را صریح نام‌گذاری کنید (COUNT(*) مجاز است).",
    };
  }
  // زیرکوئری در FROM/JOIN ممنوع
  if (/\b(?:from|join)\s*\(/i.test(masked)) {
    return { ok: false, reason: "زیرکوئری در FROM/JOIN مجاز نیست." };
  }
  // JOIN با کاما ممنوع (FROM a, b)
  if (/\bfrom\s+([A-Za-z_]\w*)(\s+(?:as\s+)?[A-Za-z_]\w*)?\s*,\s*[A-Za-z_]\w*/i.test(masked)) {
    return { ok: false, reason: "JOIN با کاما مجاز نیست؛ از JOIN صریح استفاده کنید." };
  }
  if (/\bcross\s+join\b|\bnatural\s+join\b/i.test(masked)) {
    return { ok: false, reason: "CROSS JOIN / NATURAL JOIN مجاز نیست." };
  }

  // جدول‌های استفاده‌شده باید دقیقاً در whitelist باشند
  const tablePattern = /\b(?:from|join)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  const usedTables = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = tablePattern.exec(masked)) !== null) {
    usedTables.add(m[1].toLowerCase());
  }
  if (usedTables.size === 0) {
    return { ok: false, reason: "هیچ جدولی در کوئری شناسایی نشد." };
  }
  for (const t of Array.from(usedTables)) {
    if (!ALLOWED_TABLES.has(t)) {
      return { ok: false, reason: `دسترسی به جدول «${t}» مجاز نیست.` };
    }
  }

  // LIMIT اجباری + سقف
  const limitPattern = /\blimit\s+(\d+)\b/gi;
  if (/\blimit\s+\?/i.test(masked)) {
    return { ok: false, reason: "LIMIT باید یک عدد ثابت باشد، نه پارامتر." };
  }
  const limits = Array.from(masked.matchAll(limitPattern));
  if (limits.length === 0) {
    sql = `${sql}\nLIMIT ${DEFAULT_LIMIT}`;
  } else {
    for (const l of limits) {
      if (Number(l[1]) > MAX_LIMIT) {
        return { ok: false, reason: `مقدار LIMIT بیش از حد مجاز است (حداکثر ${MAX_LIMIT}).` };
      }
    }
  }

  return { ok: true, sql, params };
}
