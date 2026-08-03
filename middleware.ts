import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
const COOKIE_NAME = "urban_session";

const PUBLIC_PATHS = ["/", "/login", "/register"];
const API_AUTH_PATHS = ["/api/analyze-incident", "/api/incidents", "/api/upload", "/api/map", "/api/geocode", "/api/search-location", "/api/stats"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/_next") || pathname.includes(".") || pathname.startsWith("/uploads");
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API auth check
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/me")) {
    const needsAuth = API_AUTH_PATHS.some((p) => pathname.startsWith(p));
    if (needsAuth) {
      const user = await getUser(req);
      if (!user) {
        return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Page protection
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const user = await getUser(req);
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based protection
  if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname.startsWith("/agency") && user.role !== "AGENCY") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};