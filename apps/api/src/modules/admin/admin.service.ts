import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getEnv } from "../../config/env";

const ALGORITHM = "sha256";
const TOKEN_TTL_SECONDS = 300; // 5 minutes

export interface AdminTokenPayload {
  sub: "admin";
  iat: number;
  exp: number;
}

/**
 * Hash a string with SHA-256 and return the digest buffer.
 */
function sha256(value: string): Buffer {
  return crypto.createHash(ALGORITHM).update(value).digest();
}

/**
 * Constant-time password comparison.
 * Hashes both input and stored password, then compares with timingSafeEqual.
 */
export function verifyPassword(input: string): boolean {
  const env = getEnv();
  const inputHash = sha256(input);
  const storedHash = sha256(env.ADMIN_PASSWORD);

  if (inputHash.length !== storedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputHash, storedHash);
}

/**
 * Sign a short-lived admin JWT using ADMIN_PASSWORD as HMAC key.
 */
export function signAdminToken(): string {
  const env = getEnv();
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    { sub: "admin", iat: now, exp: now + TOKEN_TTL_SECONDS },
    env.ADMIN_PASSWORD
  );
}

/**
 * Verify an admin JWT. Throws on invalid signature or expiry.
 */
export function verifyAdminToken(token: string): AdminTokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.ADMIN_PASSWORD) as AdminTokenPayload;
}
