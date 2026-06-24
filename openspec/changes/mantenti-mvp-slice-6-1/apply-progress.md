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

---

## PR-C: MEDIUM Fixes

### Summary

| Field | Value |
|-------|-------|
| PR | PR-C (MEDIUM fixes) |
| Branch | slice-6-1/pr-c |
| Base | master (contains PR-A + PR-B) |
| Total tasks (PR-C) | 8 |
| Completed | 8 |
| Pending | 0 |
| Mode | Standard (no test runner) |
| Delivery | chained (stacked-to-main) |
| Chain strategy | stacked-to-main |
| Review budget | ≤400 lines per PR |

### Completed Tasks

#### Phase 3: PR-C — MEDIUM Fixes

- [x] M1 — `feat(api): add pino logger and migrate notifications services` (fc1dcdb)
  - Created `apps/api/src/lib/logger.ts` with pino + pino-pretty transport in dev mode
  - Replaced console.log/error/warn in `push.service.ts`, `cron.service.ts`, and `lock.ts`
  - Structured logging with context objects (endpoint, created, skipped, err)
  - Added `pino` and `pino-pretty` to api dependencies

- [x] M2 — `fix(api): dedupe unread count in listForUser` (f03bfef)
  - `total` now always counts ALL notifications for the user (ignores unreadOnly filter)
  - `unreadCount` always counts unread-only (single source of truth)
  - Fixes filter-parity bug where total and unreadCount could diverge or double-count

- [x] M3 — `chore(api): verify Notification composite index (userId, isRead, createdAt)` (67eb7de)
  - Confirmed `@@index([userId, isRead, createdAt(sort: Desc)])` exists on Notification model
  - No schema change needed — index was already in place from slice 6
  - Verification-only commit (no-op)

- [x] M4 — `feat(api,web): add GET/DELETE /api/push/subscriptions` (0bbd3dd)
  - Added `listSubscriptions(userId)` returning id, endpoint, createdAt (no keys)
  - Added `removeSubscription(userId, endpoint)` scoped to user
  - Wired GET `/api/push/subscriptions` and DELETE `/api/push/subscriptions/:endpoint`
  - Exposed `listSubscriptions()` and `removeSubscription()` in `usePushSubscription` composable

- [x] M5 — `fix(sw): tighten URL match from includes to pathname check` (d3e59aa)
  - Replaced `client.url.includes('/clients')` with URL pathname parsing
  - Match exact `/clients` or `/clients/` prefix (prevents false positives)
  - Wrapped in try/catch for robustness against invalid client URLs

- [x] M6 — `feat(web): expose isLoading in usePushSubscription and wire to bell` (8320219)
  - Added reactive `isLoading` ref, true during subscribe/unsubscribe async work
  - Uses try/finally to guarantee reset on success or failure
  - Wired to NotificationBell: `opacity-50`, `disabled`, `aria-busy` when loading

- [x] M7 — `docs(slice-6): verify archived design.md has no drift` (45a76b6)
  - Compared design.md file changes table against actual files: all match
  - 'No schema migration required' was correct for slice 6 scope
  - Verification-only commit (no-op)

- [x] M8 — `docs(specs): extend notifications spec with PR-B/PR-C requirements` (9026f0a)
  - Added Notification Preference Management requirement
  - Added Notification Body Length Validation requirement
  - Added Batched markAllRead requirement
  - Added Structured Logging requirement
  - Added Push Subscription Management requirement

### Commits (PR-C)

| # | Hash | Message |
|---|------|---------|
| 10 | fc1dcdb | feat(api): add pino logger and migrate notifications services |
| 11 | f03bfef | fix(api): dedupe unread count in listForUser |
| 12 | 67eb7de | chore(api): verify Notification composite index (userId, isRead, createdAt) |
| 13 | 0bbd3dd | feat(api,web): add GET/DELETE /api/push/subscriptions |
| 14 | d3e59aa | fix(sw): tighten URL match from includes to pathname check |
| 15 | 8320219 | feat(web): expose isLoading in usePushSubscription and wire to bell |
| 16 | 45a76b6 | docs(slice-6): verify archived design.md has no drift |
| 17 | 9026f0a | docs(specs): extend notifications spec with PR-B/PR-C requirements |
| 18 | 1a816c9 | docs(slice-6-1): update apply-progress and tasks for PR-C |
| 19 | 42bef3c | fix(api): resolve pino type import and Express param typing |

### Files Changed (PR-C)

| File | Action | Commit | Description |
|------|--------|--------|-------------|
| `apps/api/src/lib/logger.ts` | Created | 10 | pino logger with pino-pretty dev transport |
| `apps/api/package.json` | Modified | 10 | Added pino + pino-pretty deps |
| `apps/api/src/services/notifications/push.service.ts` | Modified | 10, 13 | Logger migration + listSubscriptions/removeSubscription |
| `apps/api/src/services/notifications/cron.service.ts` | Modified | 10 | Logger migration |
| `apps/api/src/lib/lock.ts` | Modified | 10 | Logger migration |
| `apps/api/src/modules/notifications/notifications.service.ts` | Modified | 11 | Count dedup fix in listForUser |
| `apps/api/src/services/notifications/push.controller.ts` | Modified | 13 | GET/DELETE /api/push/subscriptions routes |
| `apps/web/src/composables/usePushSubscription.ts` | Modified | 13, 15 | listSubscriptions/removeSubscription + isLoading state |
| `apps/web/public/sw.js` | Modified | 14 | URL match tightening |
| `apps/web/src/components/layout/NotificationBell.vue` | Modified | 15 | isLoading wiring (opacity-50, disabled, aria-busy) |
| `openspec/specs/notifications/spec.md` | Modified | 17 | New requirements for PR-B/PR-C work |

### Build Results (PR-C)

| Target | Result | Details |
|--------|--------|---------|
| `pnpm --filter web build` | ✅ PASS | Clean build, no errors |
| `pnpm --filter api build` | ✅ PASS | Clean build, no errors |

### Deviations from Design

1. **M5 URL matching**: The tasks.md suggested `client.url.includes("/clients/")` (trailing slash). Implemented a more robust approach using `new URL(client.url).pathname` with exact `/clients` or `/clients/` prefix matching, plus try/catch for invalid URLs. Same security goal, better implementation.

2. **M7 no-op**: The archived design.md had no real drift from the slice 6 implementation. The `NotificationPreference` model and body validation were PR-B additions (a different change scope), not slice 6. Verified and moved on.

3. **M3 no-op**: The composite index `@@index([userId, isRead, createdAt(sort: Desc)])` was already present on the Notification model. Verified and moved on.

### Risks / Notes

1. **pino dependency size**: pino is lightweight (~5KB gzipped) but pino-pretty is heavier. pino-pretty is only loaded in dev mode via transport config — production bundle is unaffected.

2. **`listForUser` count semantics change**: `total` now always returns the count of ALL notifications for the user, regardless of `unreadOnly` filter. Previously, when `unreadOnly=true`, `total` returned the unread count. Frontend consumers should be aware that `total` is always "all notifications" and `unreadCount` is always "unread only".

3. **DELETE /api/push/subscriptions/:endpoint**: The endpoint is URL-encoded in the path. The controller uses `decodeURIComponent()` to recover the original endpoint URL. Axios on the frontend uses `encodeURIComponent()`.

4. **isLoading shared state**: Since `usePushSubscription` creates refs at module scope (not inside the composable function), `isLoading` is shared across all consumers. This matches the existing pattern for `isSupported`, `isSubscribed`, and `permission`.

### Next Step

PR-C complete. Stacked-to-main: ready for verification (build both apps, verify clean git status) and merge.
