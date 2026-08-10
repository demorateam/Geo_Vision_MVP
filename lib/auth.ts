import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { SessionUser } from "@/types";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return "fallback-development-secret-change-me";
  throw new Error("JWT_SECRET_MISSING");
}
const COOKIE_NAME = "urban_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function createSession(user: SessionUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: MAX_AGE });
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = createSession(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = jwt.verify(token, getJwtSecret()) as SessionUser;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
