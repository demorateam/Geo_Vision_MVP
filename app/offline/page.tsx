import Link from "next/link";
import { WifiOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "بدون اینترنت | رخداد شهری" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50 px-5 text-center">
      <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
          <WifiOff className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-950">اتصال اینترنت برقرار نیست</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          برای ورود، مشاهده رخدادها یا ثبت گزارش جدید باید به اینترنت متصل باشید. پس از اتصال دوباره تلاش کنید.
        </p>
        <Button asChild className="mt-6 h-12 w-full gap-2 rounded-xl">
          <Link href="/">
            <RotateCw className="h-4 w-4" />
            تلاش دوباره
          </Link>
        </Button>
      </section>
    </main>
  );
}
