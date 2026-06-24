# Proposal: mantenti-mvp-slice-6 (Client History + Notifications)

## Intent

Enable the disabled Historial tab on ClientDetailPage so technicians can browse closed maintenances and navigate to the detail page, and implement the full notifications system: in-app bell with unread badge, daily cron for upcoming-maintenance reminders (3d/1d/day-of at 09:00 UTC), and web push via VAPID + service worker. Both capabilities have existing Prisma models and shared types but zero backend or frontend implementation.

## Scope

### In Scope
- Enable Historial tab (CLOSED-only filter, navigate to `/maintenances/:id` per item)
- Backend notifications module: list, mark-read, read-all, push-subscribe endpoints
- Daily cron job (node-cron, 09:00 UTC) generating reminders for 3d/1d/day-of windows with dedup
- Web push: VAPID key generation, `web-push` delivery, service worker (`public/sw.js`), browser permission flow
- NotificationBell component in AppHeader with unread badge + drawer
- Pinia notification store + `usePushSubscription` composable

### Out of Scope
- DRAFT/IN_PROGRESS maintenances in history (locked: only CLOSED)
- Per-user timezone (locked: 09:00 UTC server cron)
- Notifications on maintenance completion or creation (locked: reminders only)
- Inline expand in history (locked: navigate to detail page)
- Notification TTL / auto-delete / retention policy
- Email notifications, native push, PWA offline

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `client-history`: scope narrowed to CLOSED only; row action changed from inline-expand to navigate-to-detail; PDF download deferred (no PDFs generated yet in current slices)
- `notifications`: web push upgraded from MAY to SHALL; trigger scope locked to upcoming-maintenance reminders only; cron timezone locked to 09:00 UTC

## Approach

- **Backend**: New `notifications` module (controller + service) wired into `apps/api/src/index.ts`. Cron via `node-cron` in-process (matches design decision #3: zero-infra for MVP). Push via `web-push` npm package. Dedup: check existing `Notification` with same `(clientId, window)` in last 24h before inserting.
- **Frontend**: Enable Historial tab in `ClientDetailPage.vue`, wire existing `GET /api/clients/:id/maintenances` endpoint (already paginated, returns technician + item count). New `NotificationBell.vue` in `AppHeader.vue` with slide-in drawer. Service worker at `public/sw.js` handles `push` events. `usePushSubscription` composable requests permission and POSTs subscription to backend.
- **Leverage existing**: Prisma `Notification` + `PushSubscription` models (already in schema). Shared types `NotificationListResponse`, `PushSubscribeRequest`, `ClientHistoryResponse` (already in `packages/types`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/notifications/` | New | Controller + service (list, read, read-all, push-subscribe) |
| `apps/api/src/services/notifications/cron.service.ts` | New | Daily 09:00 UTC cron, dedup logic |
| `apps/api/src/services/notifications/push.service.ts` | New | VAPID + web-push delivery |
| `apps/api/src/index.ts` | Modified | Register notifications router, start cron |
| `apps/web/src/views/ClientDetailPage.vue` | Modified | Enable Historial tab, wire history list |
| `apps/web/src/components/history/MaintenanceHistoryList.vue` | New | Paginated CLOSED list, navigate links |
| `apps/web/src/components/layout/NotificationBell.vue` | New | Bell icon, badge, drawer |
| `apps/web/src/components/layout/AppHeader.vue` | Modified | Add NotificationBell |
| `apps/web/src/stores/notifications.ts` | New | Pinia store (list, unread count, mark-read) |
| `apps/web/src/composables/usePushSubscription.ts` | New | SW register + push subscribe |
| `apps/web/public/sw.js` | New | Service worker push handler |
| `apps/web/src/main.ts` | Modified | Register service worker |
| `apps/api/package.json` | Modified | Add `web-push`, `node-cron` deps |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| VAPID key loss breaks existing push subscriptions | Low | Document `.env` backup; regenerate + re-subscribe flow |
| Service worker caching stale assets after deploy | Med | Cache-bust via version query param in SW registration |
| Cron fires twice on restart within same window | Low | Dedup query checks last 24h before insert |
| `node-cron` stops if process crashes | Low | Process manager (pm2/systemd) auto-restart; acceptable for MVP |

## Rollback Plan

- History: re-disable Historial tab (one-line change in `ClientDetailPage.vue`)
- Notifications: unregister notifications router in `index.ts`; cron never starts; no data corruption (models are additive)
- Push: remove service worker file; existing subscriptions remain in DB but are never used

## Dependencies

- `web-push` npm package (VAPID key generation + push delivery)
- `node-cron` npm package (in-process cron scheduling)
- VAPID keys in `.env` (one-time `web-push generate-vapid-keys`)

## Success Criteria

- [ ] Historial tab shows CLOSED maintenances, each item navigates to `/maintenances/:id`
- [ ] NotificationBell shows unread count badge in AppHeader
- [ ] Daily cron creates reminders at 3d/1d/day-of windows with no duplicates
- [ ] Web push delivers to browser when permission granted
- [ ] Mark-read and read-all work correctly
- [ ] All within ~735 lines, single PR
