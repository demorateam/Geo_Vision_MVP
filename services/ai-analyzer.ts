import type { AIAnalysisResult, Severity } from "@/types";

const AGENCY_LIST = [
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

const SEVERITY_COLOR: Record<Severity, AIAnalysisResult["color_code"]> = {
  Low: "Green",
  Medium: "Yellow",
  High: "Orange",
  Critical: "Red",
};

const SYSTEM_PROMPT = `You are an expert municipal emergency dispatcher.
Analyze urban incident image and description.
Return ONLY JSON:
{
"incident_type":"",
"severity":"",
"color_code":"",
"assigned_agencies":[],
"region":"",
"summary_fa":""
}

Severity values: Low, Medium, High, Critical
Color values: Green, Yellow, Orange, Red
Possible organizations: ${AGENCY_LIST.join(", ")}
Region should be a Tehran district name in Persian (e.g. منطقه ۱، منطقه ۵).
summary_fa must be a short Persian sentence describing the incident and recommended action.`;

interface OpenAIResponse {
  choices?: { message?: { content?: string } }[];
}

export async function analyzeWithOpenAI(
  imageBase64: string | null,
  description: string,
): Promise<AIAnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = (imageBase64 ? process.env.VISION_MODEL : process.env.LLM_MODEL) || "gpt-4o-mini";
  if (!apiKey) return null;

  const content: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: description || "تحلیل این رخداد شهری را انجام دهید." }];

  if (imageBase64) {
    content.push({
      type: "image_url",
      image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
    });
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.error("AI provider error:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as OpenAIResponse;
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = extractJson(raw);
    return parsed ? normalizeAnalysis(parsed) : null;
  } catch (e) {
    console.error("AI provider request failed:", e);
    return null;
  }
}

function extractJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeAnalysis(obj: Record<string, unknown>): AIAnalysisResult {
  const severity = (obj.severity as string) as Severity;
  const valid: Severity[] = ["Low", "Medium", "High", "Critical"];
  const sev = valid.includes(severity) ? severity : "Medium";
  return {
    incident_type: (obj.incident_type as string) || "نامشخص",
    severity: sev,
    color_code: SEVERITY_COLOR[sev],
    assigned_agencies: Array.isArray(obj.assigned_agencies)
      ? (obj.assigned_agencies as string[]).filter((a) => AGENCY_LIST.includes(a))
      : [],
    region: (obj.region as string) || "نامشخص",
    summary_fa: (obj.summary_fa as string) || "تحلیل خودکار انجام شد.",
  };
}

// ---- Persian keyword-based fallback analyzer ----

interface KeywordRule {
  keywords: string[];
  type: string;
  severity: Severity;
  agencies: string[];
  summary: (desc: string) => string;
}

const RULES: KeywordRule[] = [
  {
    keywords: ["گاز", "نشتی", "بوی گاز", "لوله گاز"],
    type: "نشتی گاز",
    severity: "Critical",
    agencies: ["گاز", "آتش نشانی", "اورژانس"],
    summary: () => "احتمال نشتی گاز گزارش شده. تیم اورژانس گاز و آتش نشانی فورا اعزام شوند.",
  },
  {
    keywords: ["آتش", "حریق", "شعله", "سوختن", "دود", "سوختگی"],
    type: "حریق",
    severity: "Critical",
    agencies: ["آتش نشانی", "اورژانس", "پلیس"],
    summary: () => "گزارش حریق. آتش نشانی و اورژانس با اولویت بالا اعزام شوند.",
  },
  {
    keywords: ["تصادف", "حادثه", "ضربه", "تصادف خودرو", "تصادف کرده"],
    type: "تصادف",
    severity: "High",
    agencies: ["پلیس", "اورژانس", "نهادهای امنیتی"],
    summary: () => "تصادف رخ داده. پلیس و اورژانس برای کنترل صحنه اعزام شوند.",
  },
  {
    keywords: ["چاله", "گودال", "چال", "سوراخ", "فرورفتگی", "آسفالت"],
    type: "خرابی آسفالت",
    severity: "Medium",
    agencies: ["شهرداری"],
    summary: () => "چاله یا خرابی آسفالت در مسیر. تیم شهرداری برای ترمیم اعزام شود.",
  },
  {
    keywords: ["آب", "نشتی آب", "لوله آب", "سیل", "آب گرفتگی", "سیلاب"],
    type: "مشکل آب و فاضلاب",
    severity: "High",
    agencies: ["آب و فاضلاب", "شهرداری"],
    summary: () => "مشکل شبکه آب و فاضلاب. اداره آب برای رفع نشتی اعزام شود.",
  },
  {
    keywords: ["برق", "قطع برق", "سیم", "تیر برق", "اتک برق", "اضطراری"],
    type: "مشکل برق",
    severity: "High",
    agencies: ["اداره برق", "شهرداری"],
    summary: () => "مشکل شبکه برق. اداره برق برای بررسی و رفع خطر اعزام شود.",
  },
  {
    keywords: ["سیم دزدیده", "سرقت", "دزدی", "یاغی"],
    type: "سرقت",
    severity: "Medium",
    agencies: ["پلیس", "نهادهای امنیتی"],
    summary: () => "گزارش سرقت. پلیس برای بررسی اعزام شود.",
  },
  {
    keywords: ["زباله", "پسماند", "کثیف", "آلودگی", "زباله دان"],
    type: "مشکل پسماند",
    severity: "Low",
    agencies: ["شهرداری"],
    summary: () => "انباشت زباله. شهرداری برای جمع‌آوری اعزام شود.",
  },
  {
    keywords: ["چراغ", "نور", "روشنایی", "چراغ خیابان"],
    type: "خرابی چراغ",
    severity: "Low",
    agencies: ["شهرداری", "اداره برق"],
    summary: () => "خرابی چراغ خیابان. شهرداری برای تعمیر اعزام شود.",
  },
  {
    keywords: ["درخت", "شاخه", "افتاد", "درخت افتاده"],
    type: "خطر درخت",
    severity: "Medium",
    agencies: ["شهرداری", "اورژانس"],
    summary: () => "درخت یا شاخه خطرناک. شهرداری برای پاکسازی اعزام شود.",
  },
  {
  keywords: ["درگیری", "دعوا", "نزاع", "ناآرامی", "اغتشاش", "درگیری خیابانی"],
  type: "رخداد امنیتی",
  severity: "High",
  agencies: ["نهادهای امنیتی", "پلیس", "اورژانس"],
  summary: () => "رخداد امنیتی گزارش شده. نیروهای امنیتی و پلیس برای بررسی و کنترل وضعیت اعزام شوند.",
 },
 {
  keywords: ["انفجار", "صدای انفجار", "منفجر", "ترکش", "انفجار شدید"],
  type: "انفجار",
  severity: "Critical",
  agencies: ["نهادهای امنیتی", "آتش نشانی", "اورژانس", "پلیس"],
  summary: () => "انفجار گزارش شده. نیروهای امنیتی، آتش‌نشانی و اورژانس با اولویت بسیار بالا اعزام شوند.",
 },
 {
  keywords: ["موشک", "بمب", "اصابت موشک", "اصابت بمب", "حمله موشکی", "دود غلیظ", "محل اصابت"],
  type: "محل اصابت موشک یا بمب",
  severity: "Critical",
  agencies: ["نهادهای امنیتی", "آتش نشانی", "اورژانس", "پلیس"],
  summary: () => "محل اصابت موشک یا بمب گزارش شده. نیروهای امنیتی و امدادی برای ایمن‌سازی و امدادرسانی اعزام شوند.",
 },
 {
  keywords: ["بسته مشکوک", "شیء مشکوک", "خودرو مشکوک", "کیف مشکوک", "چمدان مشکوک", "مورد مشکوک"],
  type: "موارد مشکوک",
  severity: "High",
  agencies: ["نهادهای امنیتی", "پلیس"],
  summary: () => "مورد مشکوک گزارش شده. نیروهای امنیتی برای بررسی و ایمن‌سازی محل اعزام شوند.",
 },
];

const TEHRAN_REGIONS = [
  "منطقه ۱", "منطقه ۲", "منطقه ۳", "منطقه ۴", "منطقه ۵",
  "منطقه ۶", "منطقه ۷", "منطقه ۸", "منطقه ۹", "منطقه ۱۰",
  "منطقه ۱۱", "منطقه ۱۲", "منطقه ۱۳", "منطقه ۱۴", "منطقه ۱۵",
  "منطقه ۱۶", "منطقه ۱۷", "منطقه ۱۸", "منطقه ۱۹", "منطقه ۲۰",
  "منطقه ۲۱", "منطقه ۲۲",
];

export function analyzeWithFallback(
  description: string,
  _imageBase64: string | null,
): AIAnalysisResult {
  const text = description.toLowerCase();
  const matched = RULES.find((r) => r.keywords.some((k) => text.includes(k.toLowerCase())));

  const region = TEHRAN_REGIONS[Math.floor(Math.random() * TEHRAN_REGIONS.length)];

  if (matched) {
    return {
      incident_type: matched.type,
      severity: matched.severity,
      color_code: SEVERITY_COLOR[matched.severity],
      assigned_agencies: matched.agencies,
      region,
      summary_fa: matched.summary(description),
    };
  }

  // Default: general municipal issue
  const severity: Severity = "Medium";
  return {
    incident_type: "مشکل عمومی شهری",
    severity,
    color_code: SEVERITY_COLOR[severity],
    assigned_agencies: ["شهرداری"],
    region,
    summary_fa: "رخداد عمومی شهری گزارش شد. شهرداری برای بررسی اعزام شود.",
  };
}

export async function analyzeIncident(
  imageBase64: string | null,
  description: string,
): Promise<{ result: AIAnalysisResult; source: "openai" | "fallback" }> {
  const openaiResult = await analyzeWithOpenAI(imageBase64, description);
  if (openaiResult) {
    return { result: openaiResult, source: "openai" };
  }
  return { result: analyzeWithFallback(description, imageBase64), source: "fallback" };
}
