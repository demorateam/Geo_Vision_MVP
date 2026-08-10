"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem("uemp-install-dismissed") === "1") return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      const timer = window.setTimeout(() => {
        setShowIosHelp(true);
        setHidden(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setHidden(false);
    };

    const onInstalled = () => {
      setInstallEvent(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("uemp-install-dismissed", "1");
    setHidden(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[2000] mx-auto max-w-md rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:left-5 md:right-auto md:mx-0"
      aria-label="نصب نسخه موبایل"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute left-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="بستن"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 pl-6">
        <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">نسخه موبایل رخداد شهری</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {showIosHelp
              ? "در Safari روی اشتراک‌گذاری و سپس افزودن به صفحه اصلی بزنید."
              : "برای دسترسی سریع‌تر، سامانه را روی گوشی نصب کنید."}
          </p>
        </div>
        {installEvent ? (
          <Button size="sm" onClick={install} className="shrink-0 gap-1.5">
            <Download className="h-4 w-4" />
            نصب
          </Button>
        ) : (
          <Share2 className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        )}
      </div>
    </aside>
  );
}
