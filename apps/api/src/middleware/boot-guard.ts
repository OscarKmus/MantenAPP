import { getEnv } from "../config/env";

const MIN_ADMIN_PASSWORD_LENGTH = 12;

/**
 * Defense-in-depth boot guard.
 * The Zod schema in env.ts already enforces min(12), but this function
 * provides an explicit runtime check with a clear error message.
 * Called before app.listen() in index.ts.
 */
export function bootGuard(): void {
  const env = getEnv();

  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < MIN_ADMIN_PASSWORD_LENGTH) {
    console.error(
      `FATAL: ADMIN_PASSWORD must be set and at least ${MIN_ADMIN_PASSWORD_LENGTH} characters. ` +
      `Server cannot start without a valid admin password.`
    );
    process.exit(1);
  }
}
