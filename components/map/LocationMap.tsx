"use client";
 
import dynamic from "next/dynamic";
 
export type { LocationMapProps } from "./LocationMapImpl";
 
// The Neshan SDK touches `window` as soon as its module is imported, so it must
// never be evaluated during server-side rendering. Loading the real implementation
// through next/dynamic with ssr:false guarantees it only runs in the browser.
export const LocationMap = dynamic(() => import("./LocationMapImpl").then((mod) => mod.LocationMap), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl border bg-slate-50 text-sm text-muted-foreground"
      style={{ height: "400px" }}
    >
      در حال بارگذاری نقشه...
    </div>
  ),
});
 