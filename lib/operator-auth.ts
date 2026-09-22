import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { OperatorSession } from "@/types";

const COOKIE_NAME = "geovision_operator_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

interface SignedOperatorSession extends OperatorSession {
  exp: number;
}

function getSecret() {
  const secret =
    process.env.OPERATOR_SESSION_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("OPERATOR_SESSION_SECRET_NOT_CONFIGURED");
  }
  return secret ?? "geovision-operator-local-development-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function createToken(session: OperatorSession) {
  const payload: SignedOperatorSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encoded}.${sign(encoded)}`;
}

function parseToken(token: string): SignedOperatorSession | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const actual = new TextEncoder().encode(signature);
  const expected = new TextEncoder().encode(sign(encoded));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SignedOperatorSession;
    if (
      !payload.id ||
      !payload.name ||
      !payload.agency ||
      payload.exp <= Date.now() / 1000
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function setOperatorSessionCookie(session: OperatorSession) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getOperatorSession(): Promise<OperatorSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = parseToken(token);
  if (!payload) return null;
  return {
    id: payload.id,
    name: payload.name,
    personnelCode: payload.personnelCode,
    agency: payload.agency,
  };
}

export async function requireOperatorSession() {
  const session = await getOperatorSession();
  if (!session) throw new Error("OPERATOR_UNAUTHORIZED");
  return session;
}

export async function clearOperatorSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
