# Explore — admin-bulk-delete

## Goal recap

Add multi-select bulk delete UX to list pages, protected by a single shared admin password (env var `ADMIN_PASSWORD`). No new RBAC role — admin password is orthogonal to normal JWT login. When verified, deletion is immediate (no further confirmation).

## Current state — DELETE operations inventory

| Entity | API route | File:line | Current confirmation | Request shape |
| --- | --- | --- | --- | --- |
| clients | `DELETE /api/clients/:id` | `clients.controller.ts:75` | `prompt()` — type exact client name | `{ id }` |
| equipment | `DELETE /api/equipment/:id` | `equipment.controller.ts:76` | `prompt()` — type exact equipment name | `{ id }` |
| maintenances (item) | `DELETE /api/maintenances/:id/items/:itemId` | `maintenances.controller.ts:96` | `confirm()` — "¿Eliminar este equipo de la mantención?" | `{ maintenanceId, itemId }` |
| attachments | `DELETE /api/attachments/:id` | `attachments.controller.ts:94` | None (no client-side guard found) | `{ id }` |
| software | `DELETE /api/software/:id` | `software.controller.ts:80` | `prompt()` — type exact software name (ClientDetailPage) | `{ id }` |
| action-types | `DELETE /api/action-types/:id` | `action-types.controller.ts:55` | `confirm()` in EquipmentForm | `{ id }` |
| equipment-categories | `DELETE /api/equipment-categories/:id` | `equipment-categories.controller.ts:68` | `confirm()` in EquipmentForm | `{ id }` |
| templates | `DELETE /api/templates/:id` | `templates.controller.ts:76` | None found | `{ id }` |
| notifications | No API route exists | — | — | — |

**Key pattern**: All current delete confirmations are **client-side only** (`prompt()` or `confirm()`). No server-side re-auth or password check exists. All endpoints are single-id, no bulk support.

## Auth/role middleware

- **JWT verification**: `apps/api/src/middleware/auth.ts:16` — reads `req.cookies?.accessToken`, calls `verifyAccessToken(token)` from `auth.service.ts:27`, which uses `jwt.verify(token, env.JWT_ACCESS_SECRET)`. Sets `req.user = { userId, username }`.
- **Existing re-auth / destructive-op guards**: **None**. No server-side password re-prompt, no admin check, no destructive-op middleware. The `authMiddleware` is the only guard.
- **Suggested plug-in point for admin-password check**: Two options:
  1. **New middleware file** `apps/api/src/middleware/admin-password.ts` — a standalone middleware that can be applied selectively to admin-only routes (verify endpoint, bulk delete endpoints). Keeps separation clean.
  2. **Inline in a new admin router** `apps/api/src/modules/admin/admin.controller.ts` — mount at `/api/admin/*`. The admin router would have its own middleware chain.

**Recommendation**: Option 2 — create a new `admin` module. The `/api/admin/verify` endpoint and `/api/admin/bulk-delete` endpoints live together. The verify endpoint returns a short-lived JWT; the bulk-delete endpoint accepts it.

## Env-var-driven config pattern

- **How secrets are loaded today**: `apps/api/src/config/env.ts` — Zod schema validates `process.env` at startup. `getEnv()` is a singleton that parses once and caches. No `dotenv` import in code — `.env` is loaded by `tsx` (which has built-in dotenv support in dev) or by the deployment environment.
- **Where `JWT_SECRET` lives**: `apps/api/.env` — `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are hex strings. Also defined in root `.env.example`.
- **How to mirror for `ADMIN_PASSWORD`**: Add `ADMIN_PASSWORD: z.string().min(1)` to the Zod schema in `env.ts`. Add to `apps/api/.env` and root `.env.example`. Mirror pattern exactly.

## Multi-select UI pattern

- **Existing**: **No existing pattern**. No checkbox columns, no shift-click selection, no batch action toolbar anywhere in the codebase. All list pages use card-based layouts (ClientCard) or simple list layouts (EquipmentList).
- **Recommended approach**: Introduce a reusable `useMultiSelect` composable that tracks selected IDs as a `Set<string>`. Each list component adds a checkbox per row. A floating bulk-action toolbar appears when `selected.size > 0` with a "Borrar (N)" button. This is a standard pattern and doesn't require a UI library.

## Modal / password-prompt component

- **Existing**: **No reusable modal component**. Current modals are inline `<Teleport to="body">` blocks in each view (e.g., `ClientListPage.vue:157`, `EquipmentList.vue:247`). Current delete confirmations use browser `prompt()` and `confirm()` — ugly but functional.
- **Recommended**: Build a small `AdminPasswordModal.vue` component. It:
  - Shows a modal with a password input field
  - Calls `POST /api/admin/verify` with the password
  - On success, returns the JWT token to the parent
  - On failure, shows an error message
  - This is a one-off component, not a generic modal library. Keep it simple.

## List pages likely to need bulk delete

- [x] **Clients list** (`ClientListPage.vue`) — card grid, most visible, highest priority
- [x] **Equipment list** (`EquipmentList.vue`) — used in InventoryPage and ClientDetailPage
- [ ] **Maintenance list** — no standalone list page exists yet (maintenances are accessed per-client)
- [ ] **Attachments list** — attachments are shown inline in maintenance detail, not a standalone list
- [ ] **Categories list** — categories are managed inline in EquipmentForm, not a standalone list
- [ ] **Notifications list** — no notification module exists yet (schema only, no controller/service)
- [ ] **Software list** — managed inline in ClientDetailPage, not a standalone list

**Confirmed priority**: Clients list and Equipment list are the primary targets. Others may not need bulk delete (they're small lists or don't have dedicated list pages).

## Touch points (files that will need to change)

### API
- `apps/api/src/config/env.ts` — add `ADMIN_PASSWORD` to Zod schema
- `apps/api/.env` — add `ADMIN_PASSWORD=...`
- `.env.example` — add `ADMIN_PASSWORD=...`
- **New**: `apps/api/src/modules/admin/admin.controller.ts` — verify endpoint + bulk delete endpoint
- **New**: `apps/api/src/modules/admin/admin.service.ts` — password verification, token generation
- **New**: `apps/api/src/modules/admin/admin.middleware.ts` — verify admin JWT middleware
- `apps/api/src/index.ts` — mount admin router at `/api/admin`

### UI
- **New**: `apps/web/src/composables/useMultiSelect.ts` — multi-select state management
- **New**: `apps/web/src/components/AdminPasswordModal.vue` — password input modal
- **New**: `apps/web/src/components/BulkActionBar.vue` — floating action bar when items selected
- `apps/web/src/views/ClientListPage.vue` — add checkboxes + bulk delete
- `apps/web/src/components/clients/ClientCard.vue` — add checkbox, accept multi-select mode
- `apps/web/src/components/equipment/EquipmentList.vue` — add checkboxes + bulk delete
- `apps/web/src/stores/clients.ts` — add `deleteClients(ids: string[])` method
- `apps/web/src/stores/equipment.ts` — add `deleteEquipmentBulk(ids: string[])` method

### Config
- `apps/api/.env` — `ADMIN_PASSWORD`
- `.env.example` — `ADMIN_PASSWORD`

### Tests
- No test files exist currently. No test infrastructure is configured.

## Reuse opportunities

- **Env pattern**: Copy the `envSchema` + `getEnv()` pattern exactly for `ADMIN_PASSWORD`.
- **JWT pattern**: Reuse `jsonwebtoken` library (already a dependency) for the admin token. Different secret (`ADMIN_PASSWORD` as HMAC key, or derive a signing key from it).
- **Middleware pattern**: Follow the same `authMiddleware` signature for the admin token verification middleware.
- **Store pattern**: Follow the same `deleteClient`/`deleteEquipment` pattern in Pinia stores for bulk variants.
- **Modal pattern**: The `<Teleport to="body">` pattern used in `ClientListPage.vue:157` is the template for the admin password modal.

## Risks & unknowns

1. **No `crypto` import exists yet** — `crypto.timingSafeEqual` is Node.js built-in, no install needed, but the pattern must be introduced fresh.
2. **`ADMIN_PASSWORD` as JWT signing key** — the proposal says "signed-jwt-5min" using `ADMIN_PASSWORD`. If `ADMIN_PASSWORD` is a short string (e.g., "admin123"), using it directly as a HMAC key is weak. Consider deriving a key via HKDF or at minimum enforcing a minimum length.
3. **Bulk delete performance** — deleting 50+ clients with cascading attachments/files could be slow. Need a strategy: sequential with progress, or parallel with a transaction.
4. **No existing test infrastructure** — the `verify` phase will have nothing to run against. Tests would need to be set up first.
5. **Notifications module doesn't exist** — the Prisma schema has `Notification` but no controller/service. Out of scope for this change.
6. **Equipment list is used in multiple contexts** — `EquipmentList.vue` appears in both `InventoryPage` and `ClientDetailPage`. Bulk delete behavior must work in both contexts.
7. **No existing notification system for bulk operations** — no toast/snackbar system. Success/error feedback uses `alert()`. May want to improve this as part of the change.

## Open questions for proposal phase

1. Should the admin password be a simple string comparison (with `crypto.timingSafeEqual`) or should it hash the password and compare hashes? The env var would store the plaintext password either way.
2. Should bulk delete be limited to a maximum batch size (e.g., 100 items) to prevent accidental mass deletion?
3. Should the admin token be a simple HMAC-signed JWT, or should we use a separate signing key derived from `ADMIN_PASSWORD`?
4. Is the `DELETE /api/admin/bulk-delete` endpoint the right design, or should we add bulk support to each existing entity's delete endpoint (e.g., `DELETE /api/clients` with `{ ids: [...] }`)?
5. Should we show a preview count ("Se eliminarán 5 clientes con 23 equipos asociados") before asking for the admin password?
6. Should the bulk delete UI only appear on the Clients and Equipment lists, or should all list pages support it?
7. Should we add a loading/progress indicator during bulk deletion, or just show a spinner on the button?
