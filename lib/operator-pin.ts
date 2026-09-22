import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashOperatorPin(
  pin: string,
  salt = randomBytes(16).toString("hex"),
) {
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyOperatorPin(
  pin: string,
  expectedHash: string,
  salt: string,
) {
  const encoder = new TextEncoder();
  const actual = encoder.encode(scryptSync(pin, salt, 64).toString("hex"));
  const expected = encoder.encode(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
