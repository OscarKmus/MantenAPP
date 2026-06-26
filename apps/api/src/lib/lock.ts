import logger from "./logger";
import prisma from "./prisma";

/**
 * Wraps a function in a Postgres transaction with pg_advisory_xact_lock.
 * Returns null if the lock could not be acquired (another worker is running).
 * Auto-releases on transaction commit/rollback.
 */
export async function withAdvisoryLock<T>(
  key: bigint,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Non-blocking lock attempt — returns false immediately if another worker holds it
      const rows = await tx.$queryRawUnsafe<Array<{ pg_try_advisory_xact_lock: boolean }>>(
        `SELECT pg_try_advisory_xact_lock(${key})`
      );
      if (!rows?.[0]?.pg_try_advisory_xact_lock) {
        logger.warn({ key: key.toString() }, "[lock] Another worker holds the lock, skipping");
        return null;
      }
      return await fn();
    });
  } catch (err) {
    // If lock acquisition fails (e.g. statement timeout), return null
    logger.warn({ key: key.toString(), err }, "[lock] Failed to acquire advisory lock");
    return null;
  }
}
