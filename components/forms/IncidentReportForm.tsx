"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Upload, Camera, MapPin, FileText, Check, X, Image as ImageIcon, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود"));
    reader.readAsDataURL(file);
  });
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface ResolvedLocation {
  address: string;
  region: string | null;
}

function normalizeMunicipalityZone(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const match = normalized.match(/\d{1,2}/);
  if (!match) return null;

  const zone = Number(match[0]);
  if (!Number.isInteger(zone) || zone < 1 || zone > 22) return null;

  return `منطقه ${new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(zone)}`;
}

async function resolveLocation(lat: number, lng: number): Promise<ResolvedLocation> {
  try {
    const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, {
      cache: "no-store",
    });
    if (!response.ok) return { address: "", region: null };

    const data = await response.json();
    return {
      address: data?.formatted_address ?? data?.address ?? "",
      region: normalizeMunicipalityZone(data?.municipality_zone),
    };
  } catch {
    return { address: "", region: null };
  }
}

function getDeviceLocation(): Promise<Coordinates | null> {
  if (typeof window === "undefined" || !window.isSecureContext || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      },
    );
  });
}

async function optimizeImage(file: File): Promise<File> {
  if (!("createImageBitmap" in window)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1280;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.76));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "incident";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [resolvingRegion, setResolvingRegion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  // Resolve the municipality region for GPS, search, click and marker drag.
  useEffect(() => {
    if (!location) {
      setRegion(null);
      setResolvingRegion(false);
      return;
    }

    let cancelled = false;
    setResolvingRegion(true);
    setRegion(null);

    void resolveLocation(location.lat, location.lng).then((resolved) => {
      if (cancelled) return;
      if (resolved.address) setAddress(resolved.address);
      setRegion(resolved.region);
      setResolvingRegion(false);
    });

    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lng]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const description = watch("description");

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error("فقط تصاویر JPG، PNG، WEBP، HEIC و HEIF مجاز هستند");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("حجم فایل نباید بیشتر از ۲۰ مگابایت باشد");
      return;
    }
    setFileName(file.name);
    setUploading(true);
    setImageUrl(null);
    setAnalysisFile(null);
    setLocation(null);
    setAddress("");
    setRegion(null);

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(null);

    try {
      // Image EXIF is intentionally ignored because it may be stale or unrelated
      // to the current incident. Device GPS and manual map selection are safer.
      toast.info("در حال دریافت موقعیت دستگاه...");
      const deviceLocation = await getDeviceLocation();

      if (deviceLocation) {
        setLocation(deviceLocation);
        toast.success("موقعیت از GPS دستگاه دریافت شد");
      } else {
        toast.info("موقعیت را با دکمه «موقعیت من» یا به‌صورت دستی روی نقشه انتخاب کنید");
      }

      const optimizedFile = await optimizeImage(file);
      setAnalysisFile(optimizedFile);

      const nextPreviewUrl = URL.createObjectURL(optimizedFile);
      previewObjectUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);

      const formData = new FormData();
      formData.append("file", optimizedFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در آپلود فایل");
      setImageUrl(data.url);
    } catch (error) {
      setImageUrl(null);
      setAnalysisFile(null);

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
      toast.error(error instanceof Error ? error.message : "خطا در آپلود فایل");
    } finally {
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
    if (!navigator.onLine) {
      toast.error("برای ثبت رخداد به اتصال اینترنت نیاز دارید");
      return;
    }
    if (!imageUrl) {
      toast.error("لطفا تصویر را آپلود کنید");
      setStep(1);
      return;
    }
    if (!analysisFile) {
      toast.error("فایل تصویر برای تحلیل در دسترس نیست. لطفاً تصویر را دوباره انتخاب کنید");
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
      // Region belongs to the selected coordinates, never to image/AI analysis.
      const latestResolvedLocation = region
        ? null
        : await resolveLocation(location.lat, location.lng);
      const selectedRegion = region ?? latestResolvedLocation?.region ?? "نامشخص";
      if (latestResolvedLocation?.address) setAddress(latestResolvedLocation.address);

      // Base64 is created only at final submission to keep mobile memory usage low.
      const imageBase64 = await readAsDataUrl(analysisFile);

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
          region: selectedRegion,
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
                ) : previewUrl ? (
                  <div className="relative w-full">
                    <img src={previewUrl} alt="پیش‌نمایش" className="mx-auto max-h-64 rounded-lg object-contain" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl(null);
                        setAnalysisFile(null);
                        setLocation(null);
                        setAddress("");
                        setRegion(null);
                        setFileName("");

                        if (previewObjectUrlRef.current) {
                          URL.revokeObjectURL(previewObjectUrlRef.current);
                          previewObjectUrlRef.current = null;
                        }
                        setPreviewUrl(null);

                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                        if (cameraInputRef.current) {
                          cameraInputRef.current.value = "";
                        }
                      }}
                      className="absolute left-2 top-2 rounded-full bg-red-500 p-1 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="mt-2 text-center text-xs text-muted-foreground">{fileName}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="h-10 w-10 text-slate-400" />
                    <p className="text-sm font-medium">تصویر رخداد را اضافه کنید</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WEBP - حداکثر ۲۰MB</p>
                    <div className="mt-3 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 gap-2 bg-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                        انتخاب از گالری
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 gap-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          cameraInputRef.current?.click();
                        }}
                      >
                        <Camera className="h-4 w-4" />
                        گرفتن عکس
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="انتخاب تصویر رخداد"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="گرفتن عکس رخداد با دوربین"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
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
                onAddressResolve={(addr, resolvedRegion) => {
                  if (addr) setAddress(addr);
                  setRegion(resolvedRegion);
                }}
              />
              {location && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm">
                  <p className="font-medium">موقعیت انتخاب شده:</p>
                  <p className="text-muted-foreground">عرض جغرافیایی: {location.lat.toFixed(6)}، طول جغرافیایی: {location.lng.toFixed(6)}</p>
                  {address && <p className="mt-1 text-muted-foreground">آدرس: {address}</p>}
                  <p className="mt-1 text-muted-foreground">
                    منطقه شهرداری:{" "}
                    {resolvingRegion ? "در حال تشخیص..." : region ?? "نامشخص"}
                  </p>
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