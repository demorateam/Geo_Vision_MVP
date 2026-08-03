import { randomBytes } from "crypto";

// In-memory OTP store (resets on server restart). For production, use Redis/DB.
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function generateOtp(phone: string): string {
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  otpStore.set(phone, { code, expiresAt: Date.now() + 2 * 60 * 1000 });
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  if (entry.code !== code) return false;
  otpStore.delete(phone);
  return true;
}

export function randomToken(): string {
  return randomBytes(16).toString("hex");
}
