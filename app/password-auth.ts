import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function passwordStrengthError(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  let groups = 0;
  if (/[a-z]/.test(password)) groups++;
  if (/[A-Z]/.test(password)) groups++;
  if (/\d/.test(password)) groups++;
  if (/[^a-zA-Z0-9]/.test(password)) groups++;
  if (groups < 3) {
    return "Password must include at least three: uppercase, lowercase, number, and symbol.";
  }
  return null;
}
