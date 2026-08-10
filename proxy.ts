import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "urban_session";

const PUBLIC_PATHS = ["/", "/login", "/register", "/offline"];
const PUBLIC_API_PATHS = ["/api/auth", "/api/auth/me", "/api/health"];
const PUBLIC_ASSET = /\.(?:css|js|map|png|jpg|jpeg|webp|svg|ico|woff2?|json|webmanifest)$/i;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/images/") ||
    PUBLIC_ASSET.test(pathname);
}

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("fallback-development-secret-change-me");
  }
  throw new Error("JWT_SECRET_MISSING");
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as { id: string; role: string };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API auth check
  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!isPublicApi) {
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
