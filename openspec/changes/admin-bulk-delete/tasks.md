# Tasks — admin-bulk-delete

## Summary

- Total tasks: 17
- Total estimated changed lines: ~1050
- Total new files: 11
- Total modified files: 12
- Estimated commits: 17 (work-unit commits)
- PR shape: Single
- Review budget: 1200 lines
- Forecast vs budget: under
- Chained PRs recommended: No
- 400-line budget risk: Medium
- Decision needed before apply: No

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

---

## Tasks

### Phase 1: Backend Admin Gate (Foundation)

- [x] 1.1 **Add `ADMIN_PASSWORD` to env config**
  - Files: `apps/api/src/config/env.ts` (modify), `.env.example` (modify), `apps/api/.env` (modify)
  - Add `ADMIN_PASSWORD: z.string().min(12)` to `envSchema` in `env.ts`
  - Add `ADMIN_PASSWORD=` placeholder to `.env.example` and `apps/api/.env`
  - Done when: server boots with `ADMIN_PASSWORD=123456789012` and rejects shorter values
  - Lines: 15

- [x] 1.2 **Create `admin.service.ts` — password compare + JWT sign/verify**
  - Files: `apps/api/src/modules/admin/admin.service.ts` (new)
  - `verifyPassword(input)`: SHA-256 hash both input and `ADMIN_PASSWORD`, compare with `crypto.timingSafeEqual`
  - `signAdminToken()`: `jwt.sign({ sub: 'admin', iat, exp: iat+300 }, ADMIN_PASSWORD)`
  - `verifyAdminToken(token)`: `jwt.verify(token, ADMIN_PASSWORD)` with custom error mapping
  - Done when: `verifyPassword` returns true/false, `signAdminToken` returns 5-min JWT
  - Lines: 50

- [x] 1.3 **Create `admin.middleware.ts` — `requireAdminToken`**
  - Files: `apps/api/src/modules/admin/admin.middleware.ts` (new)
  - Extract Bearer token from `Authorization` header
  - Call `verifyAdminToken`; on invalid → 401 `admin_token_invalid`; on expired → 401 `admin_token_expired`
  - Attach `req.adminToken = { valid: true, exp }` on success
  - Extend `Express.Request` type for `adminToken`
  - Done when: middleware rejects missing/invalid/expired tokens, passes valid tokens
  - Lines: 35

- [x] 1.4 **Create `admin.schema.ts` + `admin.limiter.ts`**
  - Files: `apps/api/src/modules/admin/admin.schema.ts` (new), `apps/api/src/modules/admin/admin.limiter.ts` (new)
  - Schema: `verifySchema = z.object({ password: z.string().min(1) })`
  - Limiter: `express-rate-limit` — 5 requests / 15 min / IP, keyGenerator: `req.ip`, standardHeaders: true
  - Done when: `verifySchema` validates `{ password: "x" }`, limiter rejects 6th request
  - Lines: 20

- [x] 1.5 **Create `admin.controller.ts` — `POST /api/admin/verify`**
  - Files: `apps/api/src/modules/admin/admin.controller.ts` (new)
  - Route: `POST /api/admin/verify` with `verifyLimiter` + `validate(verifySchema)`
  - Call `verifyPassword`; on match → `signAdminToken()` → 200 `{ ok: true, token, expiresIn: 300 }`
  - On mismatch → 401 `{ ok: false, error: 'invalid_password' }`
  - Log verify attempt (timestamp + IP, no password)
  - Done when: correct password returns token, wrong password returns 401
  - Lines: 35

- [x] 1.6 **Create `boot-guard.ts` + register admin routes in `index.ts`**
  - Files: `apps/api/src/middleware/boot-guard.ts` (new), `apps/api/src/index.ts` (modify)
  - `bootGuard()`: call `getEnv()`, defense-in-depth check on `ADMIN_PASSWORD.length >= 12`
  - In `index.ts`: import + call `bootGuard()` before `app.listen()`, mount `adminRouter` at `/api/admin`
  - Install `express-rate-limit` in `apps/api/package.json`
  - Done when: server exits with clear error if `ADMIN_PASSWORD` < 12; admin routes respond at `/api/admin/verify`
  - Lines: 40

### Phase 2: Backend Bulk Delete Endpoints

- [x] 2.1 **Add bulk delete + cascade preview to clients module**
  - Files: `apps/api/src/modules/clients/clients.schema.ts` (modify), `apps/api/src/modules/clients/clients.service.ts` (modify), `apps/api/src/modules/clients/clients.controller.ts` (modify)
  - Schema: `bulkDeleteSchema` (`{ ids: string[] }` min 1 max 100), `cascadePreviewSchema`
  - Service: `bulkDeleteClients(ids)` — pre-validate existence, collect attachments, `$transaction` (delete attachments + clients), best-effort file cleanup. `cascadePreviewClients(ids)` — 4 count queries (clients, equipment, maintenanceItems, attachments)
  - Controller: `POST /cascade-preview` (user JWT only), `POST /bulk-delete` (user JWT + `requireAdminToken`)
  - Done when: bulk delete with 3 valid ids returns 200; cascade preview returns counts; batch >100 returns 400
  - Lines: 90

- [x] 2.2 **Add bulk delete + cascade preview to equipment module**
  - Files: `apps/api/src/modules/equipment/equipment.schema.ts` (modify), `apps/api/src/modules/equipment/equipment.service.ts` (modify), `apps/api/src/modules/equipment/equipment.controller.ts` (modify)
  - Schema: `bulkDeleteSchema`, `cascadePreviewSchema`
  - Service: `bulkDeleteEquipment(ids)` — pre-validate, `$transaction`, file cleanup. `cascadePreviewEquipment(ids)` — 3 count queries (equipment, maintenanceItems, attachments)
  - Controller: `POST /equipment/cascade-preview` (user JWT only), `POST /equipment/bulk-delete` (user JWT + `requireAdminToken`)
  - Done when: bulk delete with 3 valid ids returns 200; cascade preview returns counts
  - Lines: 75

### Phase 3: Frontend Primitives

- [x] 3.1 **Create Toast system — composable + provider**
  - Files: `apps/web/src/composables/useToast.ts` (new), `apps/web/src/components/layout/ToastProvider.vue` (new)
  - Composable: `useToast()` → `{ success(msg), error(msg), info(msg) }` via inject/provide
  - Provider: renders toast stack at bottom-right, auto-dismiss after 4s, manual dismiss
  - Types: `{ id, message, type: 'success'|'error'|'info' }`
  - Done when: `ToastProvider` renders, `useToast().success("test")` shows toast that auto-dismisses
  - Lines: 80

- [x] 3.2 **Create `useMultiSelect.ts` composable**
  - Files: `apps/web/src/composables/useMultiSelect.ts` (new)
  - `useMultiSelect<T extends { id: string }>(items: Ref<T[]>)` → `{ selectedIds, someSelected, isAllSelected, toggleOne(id), toggleAll(), clear() }`
  - `selectedIds` is a `Set<string>` wrapped in `ref`; `someSelected`/`isAllSelected` are computed
  - Done when: toggleOne adds/removes id; toggleAll selects/deselects all; clear empties selection
  - Lines: 45

- [x] 3.3 **Create `AdminPasswordModal.vue`**
  - Files: `apps/web/src/components/AdminPasswordModal.vue` (new)
  - Teleport modal: password input + "Cancelar" + "Confirmar" buttons
  - Emits: `success(token: string)`, `cancel`
  - Calls `POST /api/admin/verify` with password; on 401 shows "Contraseña incorrecta"; on 429 shows "Demasiados intentos"
  - Clears input on error; disables button while loading
  - Done when: correct password emits `success(token)`, wrong shows error, cancel emits `cancel`
  - Lines: 70

- [x] 3.4 **Create `CascadePreviewModal.vue`**
  - Files: `apps/web/src/components/CascadePreviewModal.vue` (new)
  - Teleport modal: shows entity breakdown (e.g., "3 clientes, 5 equipos, 12 mantenciones, 8 adjuntos serán eliminados")
  - Props: `counts: { clients?, equipment, maintenanceItems, attachments }` + `loading`
  - Emits: `confirm`, `cancel`
  - Done when: modal shows counts, confirm/cancel buttons work
  - Lines: 60

- [x] 3.5 **Create `BulkActionBar.vue`**
  - Files: `apps/web/src/components/BulkActionBar.vue` (new)
  - Floating bottom bar: "N seleccionados" label + "Borrar N clientes/equipos" red button
  - Props: `count: number`, `label: string` ("clientes" or "equipos")
  - Emits: `delete`, `clear`
  - Tailwind: sticky bottom, shadow, rounded, responsive
  - Done when: bar appears when count > 0, delete button emits event
  - Lines: 45

- [x] 3.6 **Wire `ToastProvider` into `App.vue`**
  - Files: `apps/web/src/App.vue` (modify)
  - Import `ToastProvider`, wrap app content: `<ToastProvider>...</ToastProvider>`
  - Done when: app renders with toast context available to all components
  - Lines: 5

### Phase 4: Frontend List Page Integration

- [x] 4.1 **Create `api/admin.ts` client module**
  - Files: `apps/web/src/lib/api/admin.ts` (new)
  - `verifyAdminPassword(password: string)` → `POST /api/admin/verify` → `{ ok, token, expiresIn }`
  - `bulkDeleteClients(ids: string[], adminToken: string)` → `POST /api/clients/bulk-delete` with Bearer header
  - `cascadePreviewClients(ids: string[])` → `POST /api/clients/cascade-preview`
  - Same for equipment: `bulkDeleteEquipment`, `cascadePreviewEquipment`
  - Done when: functions call correct endpoints with correct auth headers
  - Lines: 45

- [x] 4.2 **Add bulk delete actions to Pinia stores**
  - Files: `apps/web/src/stores/clients.ts` (modify), `apps/web/src/stores/equipment.ts` (modify)
  - `bulkDeleteClients(ids, adminToken)`: call API, remove deleted ids from `clients` ref
  - `bulkDeleteEquipment(ids, adminToken)`: call API, remove deleted ids from `equipment` ref
  - Done when: store actions remove deleted items from reactive state
  - Lines: 30

- [x] 4.3 **Modify `ClientCard.vue` — checkbox support**
  - Files: `apps/web/src/components/clients/ClientCard.vue` (modify)
  - Props: `selected?: boolean`, emits: `toggle: [id: string]`
  - Render checkbox in card header (left of name), hidden when `selected` is undefined
  - Click checkbox emits `toggle` (does not propagate to card click)
  - Done when: checkbox visible, toggle emits id, card click still navigates
  - Lines: 25

- [x] 4.4 **Modify `ClientListPage.vue` — bulk delete integration**
  - Files: `apps/web/src/views/ClientListPage.vue` (modify)
  - Add `useMultiSelect`, `useToast`, `AdminPasswordModal`, `CascadePreviewModal`, `BulkActionBar`
  - Select-all checkbox in header, per-card checkboxes
  - Flow: select → BulkActionBar → cascade preview → admin password → bulk delete → toast → clear selection → refetch
  - Replace `alert()` in `handleDelete` with `useToast().error()`
  - Done when: multi-select works, full delete flow completes, toast shows success, `alert()` not used
  - Lines: 100

- [x] 4.5 **Modify `EquipmentList.vue` — bulk delete integration**
  - Files: `apps/web/src/components/equipment/EquipmentList.vue` (modify)
  - Add `useMultiSelect`, `useToast`, `AdminPasswordModal`, `CascadePreviewModal`, `BulkActionBar`
  - Select-all checkbox in toolbar, per-row checkboxes
  - Flow: select → BulkActionBar → cascade preview → admin password → bulk delete → toast → clear selection → refetch
  - Replace `alert()` in `handleDelete` with `useToast().error()`
  - Done when: multi-select works in both ClientDetailPage and standalone contexts, toast replaces alert
  - Lines: 90

### Phase 5: Verification + Documentation

- [ ] 5.1 **Update `.env.example` with admin password docs + verify server boot**
  - Files: `.env.example` (modify — add comment explaining min 12 chars)
  - Run server boot test: set `ADMIN_PASSWORD=short`, confirm exit; set `ADMIN_PASSWORD=validpassword12`, confirm start
  - Done when: `.env.example` documents admin password requirement, boot guard works
  - Lines: 5

- [ ] 5.2 **Manual verification run-through**
  - Files: none (documentation only)
  - Verify: POST /api/admin/verify correct/wrong password, rate limit, token expiry, bulk delete clients/equipment, cascade preview counts, single delete unchanged
  - Document results in `openspec/changes/admin-bulk-delete/verify-report.md`
  - Done when: all 14 scenarios from design.md pass
  - Lines: 0

## Out-of-scope follow-ups

- Audit log of who deleted what (verify attempts logged, but no deletion audit trail)
- Admin password rotation UI or settings page
- Bulk delete for maintenances, attachments, categories, software, templates
- Test infrastructure setup (no test runner exists)
- Toast migration: existing `alert()` calls outside changed pages are NOT migrated
