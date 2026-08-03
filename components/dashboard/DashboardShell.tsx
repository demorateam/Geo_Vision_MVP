"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  LayoutDashboard,
  FilePlus,
  ListChecks,
  Map,
  LogOut,
  Menu,
  X,
  Building2,
  User as UserIcon,
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
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard, roles: ["CITIZEN", "ADMIN", "AGENCY"] },
  { href: "/report", label: "ثبت رخداد", icon: FilePlus, roles: ["CITIZEN"] },
  { href: "/my-reports", label: "گزارش‌های من", icon: ListChecks, roles: ["CITIZEN"] },
  { href: "/admin/incidents", label: "مدیریت رخدادها", icon: ListChecks, roles: ["ADMIN"] },
  { href: "/admin/map", label: "نقشه رخدادها", icon: Map, roles: ["ADMIN"] },
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

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const roleLabel = user.role === "ADMIN" ? "مدیر سیستم" : user.role === "AGENCY" ? `اپراتور ${user.agency ?? ""}` : "شهروند";

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    toast.success("خروج موفقیت‌آمیز بود");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-64 transform border-l bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold">سامانه رخداد شهری</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-blue-50 font-medium text-blue-700" : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <UserIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pr-0">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-bold">سامانه رخداد شهری</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export { STATUS_LABELS };
