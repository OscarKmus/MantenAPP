# Tasks: Client History + Notifications (Slice 6)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850–1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend (deps + notifications + cron + push) → PR 2: Frontend (store + components + history) → PR 3: SW + wiring + verify |
| Delivery strategy | single-pr (size:exception) |
| Chain strategy | N/A — user chose single PR with size:exception |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend notifications + cron + push | PR 1 | base: main; new module + deps + index.ts wiring |
| 2 | Frontend notifications + history | PR 2 | base: main (or PR 1 branch); store, bell, history list, AppHeader |
| 3 | Service worker + final wiring | PR 3 | base: PR 2 branch; sw.js, main.ts, router, typechecks, smoke |

## Phase 1: Dependencies & Config

- [x] 1.1 Add `node-cron`, `web-push`, `@types/node-cron`, `@types/web-push` to `apps/api/package.json`, run `pnpm install`
- [x] 1.2 Verify `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` exist in `.env` (or generate via `npx web-push generate-vapid-keys`) — keys generated locally via `npx web-push generate-vapid-keys` and added to `.env` (gitignored, not committed); VAPID_SUBJECT already present in `.env`

## Phase 2: Notifications Backend

- [x] 2.1 Create `apps/api/src/modules/notifications/notifications.schema.ts` — Zod schemas: `listNotificationsQuerySchema` (unreadOnly, page, limit), `pushSubscribeSchema` (endpoint, keys.p256dh, keys.auth), `pushUnsubscribeSchema` (endpoint)
- [x] 2.2 Create `apps/api/src/modules/notifications/notifications.service.ts` — `listForUser(userId, params)`, `countUnread(userId)`, `markRead(id, userId)`, `markAllRead(userId)`, `createNotification(userId, clientId, title, body)`
- [x] 2.3 Create `apps/api/src/modules/notifications/notifications.controller.ts` — Router: `GET /api/notifications` (list + count), `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`; all behind `authMiddleware`
- [x] 2.4 Create `apps/api/src/services/notifications/push.service.ts` — `initVapid()`, `sendToUser(userId, payload)`, `sendAll(payload)` using `web-push`
- [x] 2.5 Create `apps/api/src/services/notifications/push.controller.ts` — Router: `POST /api/push/subscribe`, `POST /api/push/unsubscribe`; behind `authMiddleware`
- [x] 2.6 Modify `apps/api/src/index.ts` — import `notificationsRouter` + `pushRouter`, mount at `/api/notifications` and `/api/push`

## Phase 3: Cron + Push Delivery

- [x] 3.1 Create `apps/api/src/services/notifications/cron.service.ts` — `startCron()`: node-cron `0 9 * * *`, query clients where `nextMaintenanceAt` is today/+1d/+3d, dedup via 24h body-match, insert notifications per user, trigger push
- [x] 3.2 Modify `apps/api/src/index.ts` — call `startCron()` after `prisma.$connect()`

## Phase 4: History Backend Wiring

- [x] 4.1 Modify `apps/api/src/modules/maintenances/maintenances.service.ts` — add optional `status` param to `listClientMaintenances()`, add `status` to Prisma `where` when provided
- [x] 4.2 Modify `apps/api/src/modules/clients/clients.controller.ts` — pass `req.query.status` to `listClientMaintenances()`

## Phase 5: Frontend Notifications

- [x] 5.1 Create `apps/web/src/stores/notifications.ts` — Pinia store: `notifications[]`, `unreadCount`, `fetchNotifications(params)`, `markRead(id)`, `markAllRead()`, `fetchUnreadCount()`
- [x] 5.2 Create `apps/web/src/composables/usePushSubscription.ts` — register SW, request permission, POST subscription to `/api/push/subscribe`
- [x] 5.3 Create `apps/web/src/components/layout/NotificationBell.vue` — bell icon + badge (unreadCount), slide-in drawer with notification list, mark-read on click, 60s polling interval
- [x] 5.4 Create `apps/web/src/views/NotificationsPage.vue` — full notification list with mark-read and read-all actions, pagination
- [x] 5.5 Modify `apps/web/src/components/layout/AppHeader.vue` — import + place `<NotificationBell />` between `<div class="flex-1" />` and user info block

## Phase 6: History Frontend

- [x] 6.1 Create `apps/web/src/components/history/MaintenanceHistoryList.vue` — paginated list of CLOSED maintenances, `router.push('/maintenances/:id')` on row click, empty state, loading skeleton
- [x] 6.2 Modify `apps/web/src/views/ClientDetailPage.vue` — remove `disabled: true` from historial tab, replace placeholder `<div>` with `<MaintenanceHistoryList :client-id="clientId" />`

## Phase 7: Service Worker + Routing + Wiring

- [x] 7.1 Create `apps/web/public/sw.js` — `push` event → `self.registration.showNotification()`, `notificationclick` → `clients.openWindow('/clients')`
- [x] 7.2 Modify `apps/web/src/router/index.ts` — add `/notifications` route → `NotificationsPage.vue` with `requiresAuth: true`
- [x] 7.3 Modify `apps/web/src/main.ts` — import `usePushSubscription`, call init after auth check
- [x] 7.4 Run `pnpm --filter api build` + `pnpm --filter web build` to verify typechecks pass — vue-tsc passes clean; api tsc has pre-existing errors only

## Phase 8: Verification

- [ ] 8.1 Smoke: start API, verify cron starts (console log), verify `GET /api/notifications` returns 401 without cookie
- [ ] 8.2 Smoke: login → bell shows in header → open drawer → notifications list renders
- [ ] 8.3 Smoke: client detail → Historial tab enabled → CLOSED maintenances listed → click row navigates to detail
- [ ] 8.4 Smoke: grant push permission → trigger reminder → browser shows push notification
