# Tasks: Notifications Hardening (Slice 6-1)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Total tasks | 16 |
| PR-A tasks (CRITICAL) | 3 |
| PR-B tasks (HIGH) | 5 |
| PR-C tasks (MEDIUM) | 8 |
| PR-A estimated lines | ~400 |
| PR-B estimated lines | ~200 |
| PR-C estimated lines | ~300 |
| 400-line budget risk per PR | Low (each PR < 400) |
| Chained PRs recommended | Yes (already decided) |
| Delivery strategy | chained (PR-A → PR-B → PR-C, stacked-to-main) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| PR | Task | Goal | Likely Commit | Notes |
|----|------|------|---------------|-------|
| PR-A | C1 | Add pushsubscriptionchange handler in sw.js | feat(sw): handle pushsubscriptionchange event | Re-subscribe + POST to /api/push/subscribe |
| PR-A | C2 | Add skipWaiting + clients.claim | chore(sw): activate new SW immediately on deploy | install + activate hooks |
| PR-A | C3 | Wrap cron in advisory lock | feat(api): cron dedup with pg_advisory_xact_lock | New withAdvisoryLock helper |
| PR-B | H1 | VAPID docs | docs: add VAPID setup section to README | Update .env.example too |
| PR-B | H2 | Bell list semantics | fix(web): add role=list to NotificationBell drawer | Same pattern as MaintenanceHistoryList |
| PR-B | H3 | NotificationPreference model | feat(api): add NotificationPreference model + migration | Prisma migration generated |
| PR-B | H4 | Body length validation | feat(api): validate notification body length (max 500) | Zod schema in service |
| PR-B | H5 | markAllRead batching | fix(api): batch markAllRead in chunks of 1000 | prisma.$transaction with chunks |
| PR-C | M1 | Structured logging | feat(api): add pino logger, replace console.log | New lib/logger.ts |
| PR-C | M2 | Count dedup | refactor(api): dedupe COUNT in listForUser | Single query for total + unreadCount |
| PR-C | M3 | Composite index | feat(api): add composite index on Notification | Prisma @@index |
| PR-C | M4 | GET/DELETE /api/push/subscriptions | feat(api): add push subscription list/delete endpoints | New controller routes |
| PR-C | M5 | SW URL match tightening | fix(sw): use pathname.startsWith for URL match | From .includes to .startsWith |
| PR-C | M6 | usePushSubscription isLoading | feat(web): add isLoading state to usePushSubscription | + NotificationBell spinner |
| PR-C | M7 | Design drift fix | docs: update slice 6 design.md to mention missing files | Archived file update |
| PR-C | M8 | Notification spec update | docs: update notifications spec with new requirements | openspec/specs/notifications/spec.md |

## Phase 1: PR-A — CRITICAL Fixes

### 1.1 Add pushsubscriptionchange handler
- [x] `apps/web/public/sw.js` — Add `pushsubscriptionchange` listener that re-subscribes and POSTs new subscription to `/api/push/subscribe`
- Verify: SW still handles `push` + `notificationclick` events; new handler doesn't break existing flow

### 1.2 Add skipWaiting + clients.claim
- [x] `apps/web/public/sw.js` — Add `install` event with `self.skipWaiting()` and `activate` event with `self.clients.claim()`
- Verify: After redeploy, new SW activates immediately (test in DevTools → Application → Service Workers)

### 1.3 Cron transactional dedup with advisory lock
- [x] `apps/api/src/lib/lock.ts` (new) — `withAdvisoryLock<T>(key: bigint, fn: () => Promise<T>): Promise<T | null>` using `pg_advisory_xact_lock`
- [x] `apps/api/src/services/notifications/cron.service.ts` — Wrap `runReminders()` body in `withAdvisoryLock(NOTIFYING_KEY, ...)`
- Verify: With 2 API workers, only 1 runs the cron (check logs for "lock acquired" / "lock skipped")

## Phase 2: PR-B — HIGH Fixes

### 2.1 VAPID setup documentation
- [x] `README.md` — Add "Setup VAPID" section with `npx web-push generate-vapid-keys` instructions
- [x] `apps/api/.env.example` — Add inline comments about VAPID_SUBJECT format (`mailto:` or `https://`)
- Verify: New dev can follow README end-to-end and get push working

### 2.2 Bell drawer list semantics
- [x] `apps/web/src/components/layout/NotificationBell.vue` — Wrap notification list in `<ul role="list">` with `<li role="listitem">` per item (same pattern as MaintenanceHistoryList fix in slice 6)
- Verify: Screen reader announces "list with N items"

### 2.3 NotificationPreference model
- [x] `apps/api/prisma/schema.prisma` — Add `NotificationPreference` model with `userId` (unique FK to User), `pushEnabled` (default true), `reminderWindows` (string[], default `["3d", "1d", "0d"]`)
- [x] `apps/api/prisma/migrations/{timestamp}_notification_preference/` — generated migration
- Verify: `pnpm prisma migrate dev` applies cleanly; existing users get default preferences (backfilled via migration or app-level fallback)

### 2.4 Body length validation
- [x] `apps/api/src/modules/notifications/notifications.service.ts` — In `createNotification`, validate `body.length <= 500` (and `title.length <= 200`); throw a clear `ValidationError` if exceeded
- Verify: Creating a notification with body > 500 chars throws; <= 500 succeeds

### 2.5 markAllRead batching
- [x] `apps/api/src/modules/notifications/notifications.service.ts` — Refactor `markAllRead` to batch UPDATE in chunks of 1000 inside a transaction
- Verify: With 2500 unread notifications, the function runs 3 batches; no long table lock

## Phase 3: PR-C — MEDIUM Fixes

### 3.1 Structured logging with pino
- [ ] `apps/api/src/lib/logger.ts` (new) — `logger` export using pino, with dev-pretty mode if `NODE_ENV !== "production"`
- [ ] `apps/api/src/services/notifications/cron.service.ts` — Replace `console.log` / `console.error` with `logger.info` / `logger.error`
- [ ] `apps/api/src/services/notifications/push.service.ts` — Same replacement
- [ ] `apps/api/src/modules/notifications/notifications.service.ts` — Same replacement (where applicable)
- [ ] `apps/api/package.json` — Add `pino` + `pino-pretty` deps
- Verify: Logs are JSON in prod, pretty in dev; structured fields like `{ module: "cron", created: 5, skipped: 2 }`

### 3.2 Dedupe COUNT in listForUser
- [ ] `apps/api/src/modules/notifications/notifications.service.ts` — In `listForUser`, use a single query for `total` (where unreadOnly filter applied) and `unreadCount` (always where `userId + isRead=false`) — can use Prisma's groupBy or a `prisma.$queryRaw` with conditional aggregation
- Verify: List endpoint still returns same shape; only 1 query for the counts (was 2)

### 3.3 Composite index on Notification
- [ ] `apps/api/prisma/schema.prisma` — Add `@@index([userId, isRead, createdAt])` to `Notification` model
- [ ] `apps/api/prisma/migrations/{timestamp}_notification_composite_index/` — generated migration
- Verify: `EXPLAIN ANALYZE` on `listForUser` uses the new index; query plan shows index scan

### 3.4 GET/DELETE /api/push/subscriptions
- [ ] `apps/api/src/services/notifications/push.controller.ts` — Add `GET /api/push/subscriptions` (returns user's subscriptions, excluding sensitive `keys`) and `DELETE /api/push/subscriptions/:id`
- [ ] `apps/api/src/services/notifications/push.service.ts` — Add helper `listForUser(userId)` returning `id, endpoint, createdAt` (no keys)
- [ ] `apps/web/src/composables/usePushSubscription.ts` — Expose `listSubscriptions()` and `removeSubscription(id)` methods
- Verify: GET returns array of subscriptions; DELETE removes specific one; both require auth (401 without cookie)

### 3.5 SW URL match tightening
- [ ] `apps/web/public/sw.js` — Change `client.url.includes("/clients")` to `client.url.includes("/clients/")` (note trailing slash)
- Verify: SW only focuses windows on client detail pages, not arbitrary URLs containing "/clients" (e.g. hypothetical `/clients-archive`)

### 3.6 usePushSubscription isLoading state
- [ ] `apps/web/src/composables/usePushSubscription.ts` — Add `isLoading: Ref<boolean>` that flips during `subscribe()` and `unsubscribe()` async ops
- [ ] `apps/web/src/components/layout/NotificationBell.vue` — Use `usePushSubscription().isLoading` to show a small spinner next to the bell when a subscribe op is in flight
- Verify: Click "Subscribe to push" → spinner appears; click again → spinner hides when done

### 3.7 Slice 6 design drift fix
- [ ] `openspec/changes/archive/2026-06-24-mantenti-mvp-slice-6/design.md` — Update the "File Changes" table to mention `NotificationsPage.vue` and `usePushSubscription.ts` (which were created in slice 6 but not in the original design)
- Verify: Reading the design.md now reflects the actual implementation

### 3.8 Notifications spec update
- [ ] `openspec/specs/notifications/spec.md` — Add new requirements: `NotificationPreference`, `GET/DELETE /api/push/subscriptions`, `pushsubscriptionchange` handling, structured logging, composite index, length validation, batching
- Verify: Spec reflects all PR-A, PR-B, PR-C changes

## Phase 4: Verification per PR

### 4.A PR-A verification
- [ ] Build: `pnpm --filter web build` clean; `pnpm --filter api build` only has 5 pre-existing master errors
- [ ] Smoke: SW lifecycle — deploy, reload, verify new SW activates (DevTools)
- [ ] Smoke: Cron — start 2 API workers, verify only 1 runs the cron at 09:00 UTC (check logs for advisory lock acquisition)

### 4.B PR-B verification
- [ ] Build: same as above
- [ ] Smoke: VAPID docs — follow README from scratch on a fresh clone
- [ ] Smoke: Bell list — screen reader announces "list with N items"
- [ ] Migration: `pnpm prisma migrate dev` applies cleanly; defaults present
- [ ] Smoke: body validation — POST notification with body > 500 chars returns error
- [ ] Smoke: markAllRead batch — create 2500 unread, call markAllRead, verify 3 batches

### 4.C PR-C verification
- [ ] Build: same as above
- [ ] Smoke: logger — log output is JSON in prod mode, pretty in dev
- [ ] Smoke: count dedup — verify only 1 query for counts (check Prisma query log)
- [ ] Smoke: composite index — `EXPLAIN ANALYZE` shows index scan
- [ ] Smoke: GET /api/push/subscriptions — returns array, no keys exposed
- [ ] Smoke: SW URL match — focus only on `/clients/...` URLs
- [ ] Smoke: isLoading — spinner appears during subscribe/unsubscribe

## Phase 5: Per-PR archive
- Each PR ends with its own verify-report.md and is staged to merge to main via stacked-to-main
- Final archive at `openspec/changes/archive/2026-06-24-mantenti-mvp-slice-6-1/` (or appropriate date)