"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Gauge,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OperatorShellProps {
  operator: { name: string; personnelCode: string; agency: string };
  children: React.ReactNode;
}

export function OperatorShell({ operator, children }: OperatorShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await fetch("/api/operator/auth", { method: "DELETE" });
    router.replace("/operator/login");
    router.refresh();
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-8"
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{operator.name}</p>
              <p className="truncate text-xs text-slate-500">
                {operator.agency} · {operator.personnelCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{" "}
              آماده خدمت
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="خروج"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <MobileNav
            href="/operator"
            active={pathname === "/operator"}
            icon={Gauge}
            label="خانه"
          />
          <MobileNav
            href="/operator#missions"
            active={pathname.includes("/missions")}
            icon={ClipboardList}
            label="مأموریت‌ها"
          />
          <MobileNav
            href="/operator#performance"
            active={false}
            icon={UserRound}
            label="عملکرد من"
          />
        </div>
      </nav>
    </div>
  );
}

function MobileNav({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: typeof Gauge;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] ${active ? "font-semibold text-blue-600" : "text-slate-500"}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
