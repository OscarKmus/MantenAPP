# Apply Progress: mantenti-mvp-slice-6-1

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

---

## PR-B: HIGH Fixes

### Summary

| Field | Value |
|-------|-------|
| PR | PR-B (HIGH fixes) |
| Branch | slice-6-1/pr-b |
| Base | master (contains PR-A) |
| Total tasks (PR-B) | 5 |
| Completed | 5 |
| Pending | 0 |
| Mode | Standard (no test runner) |
| Delivery | chained (stacked-to-main) |
| Chain strategy | stacked-to-main |
| Review budget | ≤400 lines per PR |

### Completed Tasks

#### Phase 2: PR-B — HIGH Fixes

- [x] H1 — `docs(api): document VAPID setup in README and .env.example` (826a697)
  - Created `README.md` with full VAPID setup section (`npx web-push generate-vapid-keys`)
  - Updated `.env.example` with inline comments about VAPID_SUBJECT format and disabled-when-empty behavior

- [x] H2 — `fix(web): add list semantics to notifications bell drawer` (b6c0012)
  - Changed `<div>` wrapper to `<ul role="list">` with `role="listitem"` on each `<li>`
  - Added `list-none p-0 m-0` to reset default list styling

- [x] H3 — `feat(api): add NotificationPreference model, migration, and service stub` (a34e20a)
  - Added `NotificationChannel` enum (INAPP, PUSH, EMAIL) to Prisma schema
  - Added `NotificationPreference` model with composite unique on `(userId, channel)`
  - Created migration `20260624000000_notification_preference`
  - Created `preferences.service.ts` with `getForUser(userId)` and `setEnabled(userId, channel, enabled)`
  - Wired GET + PATCH `/api/notifications/preferences` routes in controller (with validation)

- [x] H4 — `fix(api): validate notification body length (max 500 chars)` (bbbfb41)
  - Added runtime `body.length > 500` and `title.length > 200` checks in `createNotification()`
  - Uses `createError(400, ...)` matching existing error pattern

- [x] H5 — `perf(api): batch markAllRead updates in chunks of 1000` (7118a3d, 175c173)
  - Refactored `markAllRead` to use `findMany({ take: 1000 })` + `updateMany({ where: { id: { in: [...] } } })` loop
  - Safeguards with max 100 iterations (100k notifications ceiling)
  - Note: `take` is not valid on `updateMany` in Prisma 6 types — used findMany+updateMany pattern instead

### Commits (PR-B)

| # | Hash | Message |
|---|------|---------|
| 4 | 826a697 | docs(api): document VAPID setup in README and .env.example |
| 5 | b6c0012 | fix(web): add list semantics to notifications bell drawer |
| 6 | a34e20a | feat(api): add NotificationPreference model, migration, and service stub |
| 7 | bbbfb41 | fix(api): validate notification body length (max 500 chars) |
| 8 | 7118a3d | perf(api): batch markAllRead updates in chunks of 1000 |
| 9 | 175c173 | fix(api): use findMany+updateMany loop for batch markAllRead |

### Files Changed (PR-B)

| File | Action | Commit | Description |
|------|--------|--------|-------------|
| `README.md` | Created | 4 | VAPID setup documentation |
| `.env.example` | Modified | 4 | Improved VAPID inline comments |
| `apps/web/src/components/layout/NotificationBell.vue` | Modified | 5 | `<ul role="list">` + `<li role="listitem">` semantics |
| `apps/api/prisma/schema.prisma` | Modified | 6 | NotificationChannel enum + NotificationPreference model |
| `apps/api/prisma/migrations/20260624000000_notification_preference/migration.sql` | Created | 6 | Migration for notification_preferences table |
| `apps/api/src/modules/notifications/preferences.service.ts` | Created | 6 | getForUser + setEnabled service stub |
| `apps/api/src/modules/notifications/notifications.controller.ts` | Modified | 6 | GET + PATCH /preferences routes |
| `apps/api/src/modules/notifications/notifications.service.ts` | Modified | 7, 8, 9 | Body validation + batched markAllRead |

### Build Results (PR-B)

| Target | Result | Details |
|--------|--------|---------|
| `pnpm --filter web build` | ✅ PASS | Clean build, no errors |
| `pnpm --filter api build` | ✅ PASS | Clean build — pre-existing errors resolved by Prisma client regeneration |

### Deviations from Design

1. **H3 model shape**: The orchestrator spec called for `(userId, channel, enabled)` with a `NotificationChannel` enum. The tasks.md had a different shape (`pushEnabled`, `reminderWindows`). Used the orchestrator spec (channel-based enum) as it's more flexible and matches the PR-B scope description.

2. **H5 batching approach**: `take` on `updateMany` is typed as `never` in Prisma 6 client types (not yet supported at the type level despite being valid SQL). Switched to `findMany({ take })` + `updateMany({ where: { id: { in } } })` loop — same chunking behavior, two queries per batch instead of one.

3. **H5 return contract**: Still returns `number` (count of updated rows). The `findMany+updateMany` loop produces the same result.

### Risks / Notes

1. **NotificationPreference migration**: The migration SQL creates a new table and enum. No data backfill — existing users will have no rows in `notification_preferences`. The service handles this by returning an empty array from `getForUser()`.

2. **Prisma client regeneration**: The `prisma generate` run on this branch resolved the 5 pre-existing type errors in `equipment.service.ts` and `inventory.service.ts` (the `software` include). These were caused by a stale Prisma client, not actual code bugs.

3. **`take` on `updateMany`**: Prisma 6 runtime supports it but types don't. The findMany+updateMany workaround is functionally equivalent. Monitor Prisma releases for type-level `take` support on `updateMany`.

### Next Step

PR-B complete. Stacked-to-main: proceed with PR-C (MEDIUM fixes — structured logging, count dedup, composite index, push subscription management, SW URL tightening, isLoading state, design drift fix, spec update).
