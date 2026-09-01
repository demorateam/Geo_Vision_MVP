"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  LayoutDashboard,
  FilePlus,
  ListChecks,
  Map,
  Flame,
  LogOut,
  Menu,
  X,
  Building2,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/types";
import { STATUS_LABELS } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SessionUser["role"][];
  children?: { href: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard, roles: ["CITIZEN", "ADMIN", "AGENCY"] },
  { href: "/report", label: "ثبت رخداد", icon: FilePlus, roles: ["CITIZEN"] },
  { href: "/my-reports", label: "گزارش‌های من", icon: ListChecks, roles: ["CITIZEN"] },
  { href: "/admin/incidents", label: "مدیریت رخدادها", icon: ListChecks, roles: ["ADMIN"] },
  { href: "/admin/map", label: "نقشه رخدادها", icon: Map, roles: ["ADMIN"] },
  { href: "/admin/heatmap", label: "نقشه حرارتی", icon: Flame, roles: ["ADMIN"] },
  {
    href: "/admin/organizations",
    label: "سازمان‌ها",
    icon: Building2,
    roles: ["ADMIN"],
    children: [
      { href: "/admin/organizations/municipality", label: "شهرداری" },
      { href: "/admin/organizations/security", label: "نهادهای امنیتی" },
      { href: "/admin/organizations/telecom", label: "مخابرات" },
      { href: "/admin/organizations/water", label: "اداره آب و فاضلاب" },
      { href: "/admin/organizations/electricity", label: "اداره برق" },
      { href: "/admin/organizations/gas", label: "اداره گاز" },
      { href: "/admin/organizations/emergency", label: "اورژانس" },
      { href: "/admin/organizations/police", label: "پلیس" },
      { href: "/admin/organizations/fire", label: "آتش نشانی" },
    ],
  },
  { href: "/agency/incidents", label: "رخدادهای محول شده", icon: Building2, roles: ["AGENCY"] },
];

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const roleLabel = user.role === "ADMIN" ? "مدیر سیستم" : user.role === "AGENCY" ? `اپراتور ${user.agency ?? ""}` : "شهروند";

  // Keep the page behind the mobile navigation fixed while the sidebar is open.
  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    toast.success("خروج موفقیت‌آمیز بود");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-50">
      <aside
        className={cn(
          "sidebar-gradient fixed inset-y-0 !right-0 !left-auto z-[2000] w-[min(20rem,88vw)] transform overflow-hidden border-l border-white/10 transition-transform duration-200 lg:static lg:z-40 lg:w-64 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        {/* Animated glow orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-pulse rounded-full bg-blue-500/25 blur-[90px] [animation-duration:6s]" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-56 w-56 animate-pulse rounded-full bg-violet-500/20 blur-[90px] [animation-delay:1.5s] [animation-duration:8s]" />
        <div className="pointer-events-none absolute -bottom-10 right-1/4 h-60 w-60 animate-pulse rounded-full bg-cyan-400/15 blur-[100px] [animation-delay:3s] [animation-duration:7s]" />
        <div className="pointer-events-none absolute -left-16 bottom-1/4 h-40 w-40 animate-[spin_28s_linear_infinite] rounded-full border border-dashed border-cyan-300/10" />

        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(96,165,250,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,165,250,0.15)_1px,transparent_1px)] [background-size:32px_32px]" />

        {/* Top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.08] to-transparent" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center">
                <div className="absolute inset-0 animate-pulse rounded-xl bg-blue-500/40 blur-md [animation-duration:3s]" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 via-blue-600 to-violet-600 shadow-lg shadow-blue-600/40">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="bg-gradient-to-l from-white to-slate-300 bg-clip-text text-sm font-bold text-transparent">
                سامانه رخداد شهری
              </span>
            </div>
            <button
              type="button"
              aria-label="بستن منو"
              className="text-slate-300 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const isExpanded = expandedItems.includes(item.href);

              if (item.children) {
                return (
                  <div key={item.href}>
                    <button
                      onClick={() => toggleExpand(item.href)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-blue-500/25 via-blue-500/10 to-transparent font-medium text-blue-200 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      {active && (
                        <span className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-cyan-300 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                      )}
                      <item.icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", active && "text-cyan-300")} />
                      <span className="flex-1 text-right">{item.label}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                    {isExpanded && (
                      <div className="mr-7 mt-1 space-y-1 border-r border-white/10 pr-3">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === child.href
                                ? "bg-gradient-to-r from-blue-500/20 to-transparent font-medium text-blue-200"
                                : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-blue-500/25 via-blue-500/10 to-transparent font-medium text-blue-200 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  {active && (
                    <span className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-cyan-300 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                  )}
                  <item.icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", active && "text-cyan-300")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3">
            <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur-sm">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a1224]">
                  <UserIcon className="h-4 w-4 text-blue-300" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-white/15 bg-white/[0.04] text-slate-200 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="بستن منو"
          className="fixed inset-0 z-[1990] bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden lg:pr-0">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:hidden">
          <button
            type="button"
            aria-label="باز کردن منو"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-bold">سامانه رخداد شهری</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="min-w-0 max-w-full flex-1 overflow-x-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <style jsx global>{`
        .sidebar-gradient {
          background: linear-gradient(160deg, #0a1a35 0%, #061126 40%, #0c1330 70%, #170f30 100%);
          background-size: 200% 200%;
          animation: sidebarGradientShift 14s ease infinite;
        }
        @keyframes sidebarGradientShift {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 0% 0%;
          }
        }
      `}</style>
    </div>
  );
}

export { STATUS_LABELS };