import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { SessionUser } from "@/types";

const SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const COOKIE_NAME = "urban_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function createSession(user: SessionUser): string {
  return jwt.sign(user, SECRET, { expiresIn: MAX_AGE });
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = createSession(user);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export function getSession(): SessionUser | null {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = jwt.verify(token, SECRET) as SessionUser;
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(): SessionUser {
  const session = getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function requireRole(...roles: SessionUser["role"][]): SessionUser {
  const session = requireAuth();
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
