import type { Metadata } from "next";
import "@fontsource-variable/estedad";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  applicationName: "رخداد شهری",
  title: "سامانه مدیریت رخداد شهری مبتنی بر هوش مصنوعی",
  description:
    "سامانه هوشمند مدیریت رخدادهای شهری با تحلیل هوش مصنوعی",
  manifest: "/app.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
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
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="manifest" href="/app.webmanifest" />
      </head>

      <body
        style={{
          fontFamily:
            '"Estedad Variable", Estedad, Tahoma, system-ui, sans-serif',
        }}
      >
        {children}

        <Toaster position="top-center" dir="rtl" />
        <PWAInstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
