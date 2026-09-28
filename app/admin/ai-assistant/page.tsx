import type { Metadata } from "next";
import { AiAssistantPanel } from "@/components/dashboard/ai-assistant-panel";

export const metadata: Metadata = {
  title: "دستیار هوشمند | GeoVision",
  description: "پرسش و پاسخ مدیریتی بر اساس داده‌های واقعی رخدادها",
};

/**
 * صفحه دستیار هوشمند — این فایل را کنار بقیه صفحات داشبورد مدیریتی قرار دهید
 * تا از layout و sidebar همان بخش استفاده کند (مثلاً: app/dashboard/ai-assistant/page.tsx)
 * و سپس یک آیتم «دستیار هوشمند» به سایدبار اضافه کنید (راهنما در README).
 */
export default function AiAssistantPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4 sm:py-6">
      <AiAssistantPanel />
    </main>
  );
}
