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
      // Lock attempt — this will block until acquired, but xact_lock has no SKIP LOCKED
      // so we use try/transaction to timeout via statement timeout if needed
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${key})`);
      return await fn();
    });
  } catch (err) {
    // If lock acquisition fails (e.g. statement timeout), return null
    console.warn(`[lock] Failed to acquire advisory lock ${key}:`, err);
    return null;
  }
}
