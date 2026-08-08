import type { Metadata } from "next";
import "@fontsource-variable/estedad";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "سامانه مدیریت رخداد شهری مبتنی بر هوش مصنوعی",
  description:
    "سامانه هوشمند مدیریت رخدادهای شهری با تحلیل هوش مصنوعی",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "سامانه رخداد شهری",
  },
};

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>

      <body
        style={{
          fontFamily:
            '"Estedad Variable", Estedad, Tahoma, system-ui, sans-serif',
        }}
      >
        {children}

        <Toaster position="top-center" dir="rtl" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}