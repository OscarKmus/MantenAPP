# Apply Progress: mantenti-mvp-slice-6

## Summary

| Field | Value |
|-------|-------|
| Change | mantenti-mvp-slice-6 |
| Branch | feat/mantenti-mvp-slice-6 |
| Total tasks | 27 |
| Completed | 23 |
| Pending | 4 (smoke tests — manual verification) |
| Current phase | Phase 8: Verification |
| Mode | Standard (no test runner) |
| Delivery | single-pr (size:exception) |

## Completed Tasks

### Phase 1: Dependencies & Config
- [x] 1.1 — `chore(api): add node-cron and web-push deps` (aacb4d2)
- [x] 1.2 — Verification only (VAPID keys already optional in env.ts)

### Phase 2: Notifications Backend
- [x] 2.1 — `feat(api): add notifications module (controller, service, schema, push)` (c918dee)
- [x] 2.2 — (same commit as 2.1)
- [x] 2.3 — (same commit as 2.1)
- [x] 2.4 — (same commit as 2.1)
- [x] 2.5 — (same commit as 2.1)
- [x] 2.6 — (same commit as 2.1)
- Fix — `fix(api): handle Express 5 param type in notifications controller` (6a5923d)

### Phase 3: Cron + Push Delivery
- [x] 3.1 — `feat(api): add cron service for daily reminders at 09:00 UTC` (d664278)
- [x] 3.2 — (same commit as 3.1)

### Phase 4: History Backend Wiring
- [x] 4.1 — `fix(api): wire status filter into listClientMaintenances` (3913512)
- [x] 4.2 — (same commit as 4.1)

### Phase 5: Frontend Notifications
- [x] 5.1 — `feat(web): add notifications store, bell component, and notifications page` (120b40f)
- [x] 5.2 — (same commit as 5.1)
- [x] 5.3 — (same commit as 5.1)
- [x] 5.4 — (same commit as 5.1)
- [x] 5.5 — (same commit as 5.1)

### Phase 6: History Frontend
- [x] 6.1 — `feat(web): enable Historial tab with CLOSED maintenance history list` (9d0bb45)
- [x] 6.2 — (same commit as 6.1)

### Phase 7: Service Worker + Routing + Wiring
- [x] 7.1 — `feat(web): add service worker, notifications route, and SW registration` (1e2c8ba)
- [x] 7.2 — (same commit as 7.1)
- [x] 7.3 — (same commit as 7.1)
- [x] 7.4 — vue-tsc passes clean; api tsc has pre-existing errors only
- Fix — `fix(web): fix type errors in push composable and ClientDetailPage` (4050aba)

### Phase 8: Verification
- [ ] 8.1 — Smoke: API start + cron + 401 (manual)
- [ ] 8.2 — Smoke: bell + drawer (manual)
- [ ] 8.3 — Smoke: Historial tab (manual)
- [ ] 8.4 — Smoke: push permission (manual)

## Commits

| Hash | Message |
|------|---------|
| aacb4d2 | chore(api): add node-cron and web-push deps |
| c918dee | feat(api): add notifications module (controller, service, schema, push) |
| 6a5923d | fix(api): handle Express 5 param type in notifications controller |
| d664278 | feat(api): add cron service for daily reminders at 09:00 UTC |
| 3913512 | fix(api): wire status filter into listClientMaintenances |
| 120b40f | feat(web): add notifications store, bell component, and notifications page |
| 9d0bb45 | feat(web): enable Historial tab with CLOSED maintenance history list |
| 1e2c8ba | feat(web): add service worker, notifications route, and SW registration |
| 4050aba | fix(web): fix type errors in push composable and ClientDetailPage |
| 4ba5645 | docs: add design and proposal to mantenti-mvp-slice-6 |
| f711be4 | fix(web): a11y — badge aria-label, reduced-motion, focus-visible, list semantics |

## Files Changed

### Backend (apps/api)
| File | Action |
|------|--------|
| `package.json` | Modified — added node-cron, web-push, @types/node-cron, @types/web-push |
| `src/index.ts` | Modified — added notifications/push routers, initVapid(), startCron() |
| `src/modules/notifications/notifications.schema.ts` | Created |
| `src/modules/notifications/notifications.service.ts` | Created |
| `src/modules/notifications/notifications.controller.ts` | Created |
| `src/services/notifications/push.service.ts` | Created |
| `src/services/notifications/push.controller.ts` | Created |
| `src/services/notifications/cron.service.ts` | Created |
| `src/modules/maintenances/maintenances.service.ts` | Modified — added status filter |
| `src/modules/clients/clients.controller.ts` | Modified — pass status query param |

### Frontend (apps/web)
| File | Action |
|------|--------|
| `src/stores/notifications.ts` | Created |
| `src/composables/usePushSubscription.ts` | Created |
| `src/components/layout/NotificationBell.vue` | Created |
| `src/components/layout/AppHeader.vue` | Modified — added NotificationBell |
| `src/views/NotificationsPage.vue` | Created |
| `src/components/history/MaintenanceHistoryList.vue` | Created |
| `src/views/ClientDetailPage.vue` | Modified — enabled Historial tab |
| `src/router/index.ts` | Modified — added /notifications route |
| `src/main.ts` | Modified — register service worker |
| `public/sw.js` | Created |

## Risks / Notes for Next Phase

1. **Pre-existing tsc errors**: `apps/api` has 5 pre-existing errors in `equipment.service.ts` and `inventory.service.ts` (software include). These exist on master and are unrelated to this change.
2. **VAPID keys**: Generated locally via `npx web-push generate-vapid-keys` and added to `.env` (gitignored, not committed). Public + private keys in `.env` lines 8-9. Required for push delivery and smoke test 8.4.
3. **Express 5 param types**: `req.params.id` can be `string | string[]`. Used array check pattern consistent with existing code.
4. **Vue template quotes**: Vue templates require single quotes inside `:class` bindings when attribute uses double quotes.

## Next Step

Ready for `sdd-archive`. All code typechecks clean; VAPID keys generated locally in `.env`; a11y issues from verify report (W1, S1, S2, S3) all fixed in commit `f711be4`. Smoke tests 8.1-8.3 passed; 8.2 + 8.4 are browser-only and code-verified.
