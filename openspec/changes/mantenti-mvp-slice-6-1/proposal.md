# Proposal: mantenti-mvp-slice-6-1 (Notifications Hardening)

## Intent

Fix the 3 critical bugs and 13 high/medium-priority tech debt issues identified in the post-archive review of `mantenti-mvp-slice-6` (Client History + Notifications). The change hardens the push notification lifecycle (SW updates, subscription rotation, cron race conditions), improves observability (structured logging, count query performance), and closes UX gaps (Bell list semantics, length validation, batched markAllRead, GET endpoint for subscriptions).

## Scope

### In Scope — 3 PRs chained, stacked-to-main

#### PR-A — CRITICAL (3 issues, ~400 lines)
- **C1** Add `pushsubscriptionchange` handler in `sw.js` to handle Chrome subscription rotation (every ~2 years)
- **C2** Add `skipWaiting` + `clients.claim` in `sw.js` for immediate SW activation after deploy
- **C3** Fix cron race condition with multi-instance via transactional dedup + PostgreSQL advisory lock

#### PR-B — HIGH (5 issues, ~200 lines)
- **H1** Document VAPID setup in README + `.env.example` comments
- **H2** Add `role="list"` + `role="listitem"` semantics to NotificationBell drawer list (same pattern as the MaintenanceHistoryList fix in slice 6)
- **H3** Add `NotificationPreference` Prisma model + migration (for user-level settings: push opt-in/out, reminder window preferences)
- **H4** Add `body` length validation (max 500 chars) in `createNotification` service via Zod
- **H5** Batch `markAllRead` UPDATE in chunks of 1000 to avoid long table locks

#### PR-C — MEDIUM (8 issues, ~300 lines)
- **M1** Add structured logging (pino) in api services — replace `console.log` in cron, push, notifications modules
- **M2** Dedupe double COUNT in `listForUser` — single query for `total` + `unreadCount` using conditional aggregation
- **M3** Add composite index `(userId, isRead, createdAt)` on `Notification` model
- **M4** Add `GET /api/push/subscriptions` endpoint (list user's devices) + corresponding `DELETE /api/push/subscriptions/:id`
- **M5** Tighten `sw.js:38` URL match from `url.includes("/clients")` to `pathname.startsWith("/clients/")`
- **M6** Add `isLoading` reactive state to `usePushSubscription` for better UX during subscribe/unsubscribe
- **M7** Update archived slice 6 design.md to mention `NotificationsPage.vue` + `usePushSubscription.ts` (drift fix)
- **M8** Add `tag` to `sw.js` push options to avoid stacking same-client notifications (already partially done — verify and document)

### Out of Scope (LOW priority — separate future slice)
- **L1** Automated tests for slice 6 surface area (no test runner in project)
- **L2** Refactor `sendAll` in push.service.ts to dedupe with `sendToUser` (DRY)
- **L3** i18n for cron body strings (English `bodySuffix` vs Spanish UI strings conflict)

## Capabilities

### Modified Capabilities
- **`notifications`** (existing canonical spec at `openspec/specs/notifications/spec.md`):
  - Adds `pushsubscriptionchange` handling
  - Adds `skipWaiting` + `clients.claim` SW lifecycle
  - Adds transactional cron dedup with advisory lock
  - Adds `NotificationPreference` model
  - Adds `GET /api/push/subscriptions` + `DELETE /api/push/subscriptions/:id`
  - Adds structured logging requirement
  - Adds composite index on `Notification`
  - Adds body length validation

### Unchanged Capabilities
- **`client-history`**: no changes from this slice. The Bell drawer list semantics fix lives under `notifications` capability.

## Approach

- **PR-A**: SW changes are 8 lines in `sw.js`. Cron change introduces a `withAdvisoryLock` helper that wraps `runReminders()` in a transaction with `pg_advisory_xact_lock`. Both changes are backward-compatible — if `pushsubscriptionchange` isn't triggered, push still works; if lock acquisition fails, the cron run is skipped (idempotent retry next day).
- **PR-B**: Schema migration for `NotificationPreference` is non-destructive (all fields optional with defaults). List semantics fix reuses the pattern from the MaintenanceHistoryList fix in slice 6. Length validation uses Zod schema in the service layer. `markAllRead` batching uses `prisma.$transaction` with chunks.
- **PR-C**: `pino` is a backend-only dep (doesn't affect web bundle). M2 uses Prisma's conditional aggregation via raw SQL fragment or `prisma.$queryRaw`. M4 adds a new controller route. M5/M6/M8 are small file changes. M7 is a doc fix on an archived file.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/public/sw.js` | Modified (PR-A, PR-C) | pushsubscriptionchange, skipWaiting, clients.claim, URL match |
| `apps/api/src/services/notifications/cron.service.ts` | Modified (PR-A) | Transactional dedup + advisory lock |
| `apps/api/src/lib/lock.ts` | New (PR-A) | `withAdvisoryLock` helper using `pg_advisory_xact_lock` |
| `apps/api/prisma/schema.prisma` | Modified (PR-B, PR-C) | `NotificationPreference` model + composite index |
| `apps/api/src/modules/notifications/notifications.service.ts` | Modified (PR-B, PR-C) | Length validation, count dedup, markAllRead batching |
| `apps/api/src/services/notifications/push.service.ts` | Modified (PR-C) | Structured logger |
| `apps/api/src/services/notifications/push.controller.ts` | Modified (PR-C) | New GET/DELETE endpoints |
| `apps/web/src/components/layout/NotificationBell.vue` | Modified (PR-B, PR-C) | List semantics, isLoading state |
| `apps/web/src/composables/usePushSubscription.ts` | Modified (PR-C) | isLoading state |
| `apps/api/src/lib/logger.ts` | New (PR-C) | pino-based logger |
| `apps/api/package.json` | Modified (PR-C) | Add `pino` + `pino-pretty` |
| `README.md` | Modified (PR-B) | VAPID setup section |
| `apps/api/.env.example` | Modified (PR-B) | VAPID setup comments |
| `openspec/changes/archive/2026-06-24-mantenti-mvp-slice-6/design.md` | Modified (PR-C) | Drift fix (mention NotificationsPage.vue + usePushSubscription.ts) |
| `openspec/specs/notifications/spec.md` | Modified (PR-C) | Update with new requirements |
| `openspec/changes/mantenti-mvp-slice-6-1/` | New | This change's artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `pg_advisory_xact_lock` requires Postgres ≥ 9.0 + superuser or `pg_advisory_unlock` perms | Low | Project uses Prisma + modern Postgres; verify perms in env. Lock is auto-released at transaction end (xact variant). |
| `pino` adds bundle size to API | Low | Server-side only, doesn't affect web bundle. |
| `NotificationPreference` migration breaks existing users | Low | All fields optional with sensible defaults; no data backfill. |
| `pushsubscriptionchange` fires during dev/testing and creates noise | Low | Feature-detect before calling; silent no-op if missing. |
| Advisory lock conflicts with future migrations | Very Low | Use a well-known constant lock key; document in schema. |
| `pino` JSON logs break local dev readability | Low | Use `pino-pretty` in dev mode via `NODE_ENV` check. |

## Rollback Plan

- **PR-A**: revert commits; SW and cron revert to old behavior. Existing notifications still work. Stale subscriptions on client side just stop firing.
- **PR-B**: revert commits; schema migration rollback drops `NotificationPreference`. Service validation back to old (no length check). markAllRead back to unbounded UPDATE.
- **PR-C**: revert commits; structured logging falls back to console via compat shim. Composite index can be dropped via `DROP INDEX`. New endpoints become 404.

## Dependencies

- **NEW**: `pino` + `pino-pretty` (backend only, ~2MB installed). Already widely used in Node ecosystem, well-maintained.
- No new web/frontend deps.

## Success Criteria

### PR-A
- [ ] `sw.js` has `pushsubscriptionchange` handler
- [ ] `sw.js` has `install` → `skipWaiting()` and `activate` → `clients.claim()`
- [ ] `cron.service.ts` wraps `runReminders()` in `withAdvisoryLock` using `pg_advisory_xact_lock`
- [ ] `withAdvisoryLock` helper is unit-testable (signature: `withAdvisoryLock(key, fn): Promise<T>`)
- [ ] Web typecheck stays clean
- [ ] No new API tsc errors

### PR-B
- [ ] `NotificationPreference` model in Prisma schema with `userId` (unique FK), `pushEnabled` (default true), `reminderWindows` (string[], default ["3d","1d","0d"])
- [ ] Migration generated + applied without data loss
- [ ] NotificationBell drawer list has `role="list"` + each item `role="listitem"`
- [ ] `createNotification` rejects `body` > 500 chars with clear error
- [ ] `markAllRead` batches in chunks of 1000
- [ ] README has "Setup VAPID" section with `npx web-push generate-vapid-keys` command
- [ ] Web typecheck stays clean
- [ ] No new API tsc errors

### PR-C
- [ ] `pino` + `pino-pretty` installed and configured
- [ ] `apps/api/src/lib/logger.ts` exports `logger` (pino instance) with dev/prod modes
- [ ] `console.log` in `cron.service.ts`, `push.service.ts`, `notifications.service.ts` replaced with `logger.info` / `logger.error`
- [ ] `listForUser` makes 1 query for `total` + `unreadCount` (was 2 COUNTs)
- [ ] Composite index `(userId, isRead, createdAt)` on Notification
- [ ] `GET /api/push/subscriptions` returns user's devices (id, endpoint, createdAt)
- [ ] `DELETE /api/push/subscriptions/:id` removes a specific subscription
- [ ] `usePushSubscription` exposes `isLoading` ref
- [ ] `NotificationBell` shows spinner when `isLoading` is true
- [ ] Archived slice 6 design.md updated to mention `NotificationsPage.vue` + `usePushSubscription.ts`
- [ ] `notifications/spec.md` updated with new requirements
- [ ] Web typecheck stays clean
- [ ] No new API tsc errors

## Delivery Plan

- **PR-A** stacked-to-main: `slice-6-1/pr-a` → main
- **PR-B** stacked-to-main: `slice-6-1/pr-b` → main (after PR-A merged)
- **PR-C** stacked-to-main: `slice-6-1/pr-c` → main (after PR-B merged)

Each PR is independently reviewable, typechecks clean, and has its own verify report.
