# Apply Progress: mantenti-mvp-slice-6-1 (PR-A)

## Summary

| Field | Value |
|-------|-------|
| Change | mantenti-mvp-slice-6-1 |
| PR | PR-A (CRITICAL fixes) |
| Branch | slice-6-1/pr-a |
| Base | feat/mantenti-mvp-slice-6 (132cfe8) |
| Total tasks (PR-A) | 3 |
| Completed | 3 |
| Pending | 0 |
| Mode | Standard (no test runner) |
| Delivery | chained (stacked-to-main) |
| Chain strategy | stacked-to-main |
| Review budget | ≤400 lines per PR |

## Completed Tasks

### Phase 1: PR-A — CRITICAL Fixes

- [x] 1.1 — `feat(sw): handle pushsubscriptionchange event` (cd4344a)
  - Added `pushsubscriptionchange` listener in `sw.js`
  - Extracts new subscription keys and POSTs to `/api/push/subscribe`
  - Silent no-op if `newSubscription` is null (browser doesn't support resubscribe)

- [x] 1.2 — `chore(sw): activate new SW immediately on deploy` (1682f3a)
  - Added `install` event with `self.skipWaiting()`
  - Added `activate` event with `self.clients.claim()`
  - New SW activates immediately after deploy without waiting for tab close

- [x] 1.3 — `feat(api): cron dedup with pg_advisory_xact_lock` (f161ebe)
  - Created `apps/api/src/lib/lock.ts` with `withAdvisoryLock<T>(key, fn)` helper
  - Uses `pg_advisory_xact_lock` inside Prisma `$transaction` — auto-releases on commit/rollback
  - Wrapped `runReminders()` body in `withAdvisoryLock(NOTIFYING_KEY, ...)`
  - Lock key `0x6E4E5446494E475249` = "NOTIFYING" in ASCII hex (stable 64-bit constant)
  - Returns `null` if lock acquisition fails (e.g., statement timeout) — idempotent retry next cron tick

## Commits

| # | Hash | Message |
|---|------|---------|
| 0 | 5ed8869 | docs: add proposal, design, and tasks for mantenti-mvp-slice-6-1 |
| 1 | cd4344a | feat(sw): handle pushsubscriptionchange event |
| 2 | 1682f3a | chore(sw): activate new SW immediately on deploy |
| 3 | f161ebe | feat(api): cron dedup with pg_advisory_xact_lock |

## Files Changed

| File | Action | Commit | Description |
|------|--------|--------|-------------|
| `openspec/changes/mantenti-mvp-slice-6-1/proposal.md` | Created | 0 | Change proposal |
| `openspec/changes/mantenti-mvp-slice-6-1/design.md` | Created | 0 | Technical design |
| `openspec/changes/mantenti-mvp-slice-6-1/tasks.md` | Created | 0 | Task breakdown |
| `apps/web/public/sw.js` | Modified | 1, 2 | pushsubscriptionchange handler + skipWaiting/clients.claim |
| `apps/api/src/lib/lock.ts` | Created | 3 | `withAdvisoryLock` helper using `pg_advisory_xact_lock` |
| `apps/api/src/services/notifications/cron.service.ts` | Modified | 3 | Wrapped `runReminders()` in advisory lock |

## Build Results

| Target | Result | Details |
|--------|--------|---------|
| `pnpm --filter web build` | ✅ PASS | Clean build, no errors |
| `pnpm --filter api build` | ✅ PASS (pre-existing errors) | 5 pre-existing master errors in `equipment.service.ts` and `inventory.service.ts` — NOT new |

## Risks / Notes

1. **Advisory lock requires Postgres permissions**: `pg_advisory_xact_lock` needs the DB role to have permissions on the advisory lock functions. Standard Prisma + Postgres setups typically have this. If the lock fails to acquire, the cron run is skipped — logged as warning, next day retries.

2. **`pg_advisory_xact_lock` is blocking**: Unlike `pg_try_advisory_xact_lock`, this variant blocks until the lock is acquired. The try/catch pattern handles timeout scenarios (e.g., Postgres `statement_timeout`). For multi-instance cron, the second instance will block until the first commits, then skip (the work is already done).

3. **Cron still uses `console.log`**: Will be replaced by structured logging (pino) in PR-C. The advisory lock warning in `lock.ts` also uses `console.warn` — same PR-C replacement.

4. **SW `pushsubscriptionchange` is Chrome-specific**: Firefox and Safari handle subscription rotation differently. The handler is a no-op if `event.newSubscription` is null, so it's safe across browsers.

5. **No schema changes in PR-A**: This PR is purely behavioral (SW lifecycle + cron dedup). No Prisma migration needed.

## Next Step

PR-A complete. Stacked-to-main: wait for user merge to main, then proceed with PR-B (NotificationPreference model, body validation, markAllRead batching, Bell list semantics, VAPID docs).
