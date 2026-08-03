"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Upload, MapPin, FileText, Check, X, Image as ImageIcon, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { extractGpsFromImage } from "@/hooks/use-exif";
import { cn } from "@/lib/utils";
import type { AIAnalysisResult } from "@/types";

const LocationMap = dynamic(
  () => import("@/components/map/LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground">
        در حال بارگذاری نقشه...
      </div>
    ),
  },
);

const MAX_SIZE = 20 * 1024 * 1024;

const FormSchema = z.object({
  description: z.string().min(5, "توضیحات حداقل ۵ کاراکتر"),
});

type FormValues = z.infer<typeof FormSchema>;

const STEPS = [
  { id: 1, label: "آپلود تصویر", icon: ImageIcon },
  { id: 2, label: "انتخاب موقعیت", icon: MapPin },
  { id: 3, label: "توضیحات", icon: FileText },
];

export function IncidentReportForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const description = watch("description");

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("فقط فایل تصویری مجاز است");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("حجم فایل نباید بیشتر از ۲۰ مگابایت باشد");
      return;
    }
    setFileName(file.name);
    setUploading(true);

    try {
      // Read as base64 for AI
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setImageBase64(base64);
        setImageUrl(base64);

        // Try extract GPS
        try {
          const gps = await extractGpsFromImage(file);
          if (gps) {
            setLocation({ lat: gps.latitude, lng: gps.longitude });
            toast.success("موقعیت GPS از عکس استخراج شد");
          } else {
            toast.info("GPS در عکس یافت نشد. لطفا موقعیت را روی نقشه انتخاب کنید");
          }
        } catch {
          // ignore
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);

      // Also upload to server for storage
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      }
    } catch {
      toast.error("خطا در آپلود فایل");
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // Runs AI analysis silently in the background, then submits the report.
  const onFinalSubmit = async () => {
    if (!imageUrl) {
      toast.error("لطفا تصویر را آپلود کنید");
      setStep(1);
      return;
    }
    if (!location) {
      toast.error("لطفا موقعیت را روی نقشه انتخاب کنید");
      setStep(2);
      return;
    }
    if (!description || description.length < 5) {
      toast.error("لطفا توضیحات را کامل کنید");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Silent AI analysis (no UI shown to the user for this step)
      const analysisRes = await fetch("/api/analyze-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, description }),
      });
      const analysisData = await analysisRes.json();
      if (!analysisRes.ok) throw new Error(analysisData.error || "خطا در تحلیل رخداد");
      const analysis = analysisData.analysis as AIAnalysisResult;

      // 2) Create the incident using the analysis result
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          description,
          latitude: location.lat,
          longitude: location.lng,
          region: analysis.region,
          incidentType: analysis.incident_type,
          severity: analysis.severity,
          colorCode: analysis.color_code,
          aiSummary: analysis.summary_fa,
          assignedAgencies: analysis.assigned_agencies,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("گزارش شما ثبت شد");
      router.push("/my-reports");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ثبت رخداد");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!imageUrl;
    if (step === 2) return !!location;
    if (step === 3) return !!description && description.length >= 5;
    return true;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1 1 0%" : "0 0 auto" }}>
            <div className="flex shrink-0 flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  step > s.id ? "border-green-500 bg-green-500 text-white" : step === s.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-400",
                )}
              >
                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={cn("mt-1 whitespace-nowrap text-xs", step >= s.id ? "font-medium text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-2 h-0.5 flex-1 rounded-full", step > s.id ? "bg-green-500" : "bg-slate-200")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">آپلود تصویر رخداد</h2>
              <p className="text-sm text-muted-foreground">تصویر رخداد را آپلود کنید. فرمت‌های JPG، PNG، WEBP و حداکثر ۲۰ مگابایت.</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                  dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
                )}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">در حال آپلود...</p>
                  </div>
                ) : imageUrl ? (
                  <div className="relative w-full">
                    <img src={imageUrl} alt="پیش‌نمایش" className="mx-auto max-h-64 rounded-lg object-contain" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImageUrl(null); setImageBase64(null); setFileName(""); }}
                      className="absolute left-2 top-2 rounded-full bg-red-500 p-1 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="mt-2 text-center text-xs text-muted-foreground">{fileName}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="h-10 w-10 text-slate-400" />
                    <p className="text-sm font-medium">تصویر را اینجا رها کنید یا کلیک کنید</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WEBP - حداکثر ۲۰MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">انتخاب موقعیت رخداد</h2>
              <p className="text-sm text-muted-foreground">روی نقشه کلیک کنید تا موقعیت رخداد را مشخص کنید یا آدرس را جستجو کنید.</p>
              <LocationMap
                center={location ?? { lat: 35.7219, lng: 51.3347 }}
                selectable
                showSearch
                height="400px"
                onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
                onAddressResolve={(addr) => setAddress(addr)}
              />
              {location && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm">
                  <p className="font-medium">موقعیت انتخاب شده:</p>
                  <p className="text-muted-foreground">عرض جغرافیایی: {location.lat.toFixed(6)}، طول جغرافیایی: {location.lng.toFixed(6)}</p>
                  {address && <p className="mt-1 text-muted-foreground">آدرس: {address}</p>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">توضیحات رخداد</h2>
              <p className="text-sm text-muted-foreground">لطفا رخداد را به طور کامل توضیح دهید.</p>
              <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">توضیحات</Label>
                  <Textarea
                    id="description"
                    placeholder="مثال: چاله عمیقی در خیابان اصلی ایجاد شده و باعث تصادف شده است..."
                    rows={6}
                    {...register("description")}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || submitting} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          مرحله قبل
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={!canProceed()} className="gap-2">
            مرحله بعد
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onFinalSubmit} disabled={!canProceed() || submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                ثبت نهایی
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}