import { randomBytes, randomInt } from "crypto";

// In-memory OTP store (resets on server restart). For production, use Redis/DB.
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const lastRequest = new Map<string, number>();
const OTP_TTL = 2 * 60 * 1000;
const REQUEST_COOLDOWN = 30 * 1000;
const MAX_ATTEMPTS = 5;

export function generateOtp(phone: string): string {
  const now = Date.now();
  const previous = lastRequest.get(phone) ?? 0;
  if (now - previous < REQUEST_COOLDOWN) throw new Error("OTP_RATE_LIMIT");

  const code = randomInt(10000, 100000).toString();
  otpStore.set(phone, { code, expiresAt: now + OTP_TTL, attempts: 0 });
  lastRequest.set(phone, now);
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS && entry.code !== code) {
    otpStore.delete(phone);
    return false;
  }
  if (entry.code !== code) return false;
  otpStore.delete(phone);
  return true;
}

export function isDemoOtpMode(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.OTP_MODE === "demo";
}

export function randomToken(): string {
  return randomBytes(16).toString("hex");
}
