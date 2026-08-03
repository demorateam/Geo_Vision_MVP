export type Role = "CITIZEN" | "ADMIN" | "AGENCY";
export type IncidentStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";
export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  agency?: string | null;
}

export interface IncidentWithRelations {
  id: string;
  incidentNumber: string;
  reporterId: string;
  imageUrl: string;
  description: string;
  latitude: number;
  longitude: number;
  region: string;
  incidentType: string;
  severity: Severity;
  colorCode: string;
  aiSummary: string | null;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; name: string; phone: string };
  agencies: { id: string; agencyName: string; assignedAt: string }[];
}

export interface AIAnalysisResult {
  incident_type: string;
  severity: Severity;
  color_code: "Green" | "Yellow" | "Orange" | "Red";
  assigned_agencies: string[];
  region: string;
  summary_fa: string;
}

export const AGENCY_LIST = [
  "شهرداری",
  "نهادهای امنیتی",
  "مخابرات",
  "آب و فاضلاب",
  "اداره برق",
  "گاز",
  "اورژانس",
  "پلیس",
  "آتش نشانی",
] as const;

export const SEVERITY_COLOR_MAP: Record<Severity, string> = {
  Low: "Green",
  Medium: "Yellow",
  High: "Orange",
  Critical: "Red",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  IN_PROGRESS: "در حال انجام",
  RESOLVED: "حل شده",
};

export const SEVERITY_LABELS: Record<string, string> = {
  Low: "کم",
  Medium: "متوسط",
  High: "زیاد",
  Critical: "بحرانی",
};
