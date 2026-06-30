# Apply Progress: mantenti-mvp-slice-7

## PR-A: 2026-06-30 — completed

### Branch
`slice-7/pr-a` (based on `master` at `0688243`)

### Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `a58af6a` | `feat(schema): add UserRole enum and createdById ownership fields` |
| 2 | `5af64ea` | `feat(types): add UserRole type and role field to User interface` |
| 3 | `a1aad8f` | `feat(auth): include role in JWT access token and refresh re-reads` |
| 4 | `5a3b602` | `feat(middleware): add role to req.user, requireRole and requireOwnershipOrAdmin factories` |
| 5 | `fd53d02` | `feat(users): add Zod validation schemas for user CRUD` |
| 6 | `77d8e16` | `feat(users): implement user CRUD service with last-admin protection` |
| 7 | `0eadf04` | `feat(users): add admin-only user management endpoints` |
| 8 | `a7c6abd` | `feat(api): mount users router at /api/users` |
| 9 | `31ad0fa` | `feat(seed): set admin user role to ADMIN` |
| 10 | `3163d5a` | `fix(test): remove non-existent register fallback from e2e test` |
| 11 | `e8661f0` | `docs: document RBAC role model and admin user management` |
| 12 | `26a645e` | `fix(api): await async refresh call and fix params typing in users controller` |

### Files Changed

**Schema & Migration**
- `apps/api/prisma/schema.prisma` — Added `UserRole` enum, `User.role`, `createdById` + `createdBy` on Client/Equipment/Software/Template/Attachment, indexes
- `apps/api/prisma/migrations/20260630000000_add_user_role_and_created_by/migration.sql` — New migration with enum, columns, FK constraints, indexes, backfill SQL

**Shared Types**
- `packages/types/src/models.ts` — Added `UserRole` type, `role` field on `User` interface

**Auth**
- `apps/api/src/modules/auth/auth.service.ts` — `TokenPayload` adds `role`, `sanitizeUser` includes `role`, `login()` builds payload with `role`, `refresh()` re-reads user from DB for fresh role
- `apps/api/src/modules/auth/auth.controller.ts` — `await` on now-async `refresh()` call

**Middleware**
- `apps/api/src/middleware/auth.ts` — `req.user` adds `role: UserRole`, exports `requireRole()` and `requireOwnershipOrAdmin()` factories with nested error shape

**Users Module (new)**
- `apps/api/src/modules/users/users.schema.ts` — Zod schemas: `createUserSchema` (`.strict()`), `updateUserRoleSchema` (`.strict()`)
- `apps/api/src/modules/users/users.service.ts` — `listUsers()`, `createUser()`, `updateUserRole()` (self-demotion block + last-admin guard), `deleteUser()` (last-admin guard), `sanitizeUser()`
- `apps/api/src/modules/users/users.controller.ts` — Router with `authMiddleware` + `requireRole("ADMIN")` on all routes: GET /, POST /, PATCH /:id/role, DELETE /:id

**API Entry**
- `apps/api/src/index.ts` — Import + mount `usersRouter` at `/api/users`

**Seed**
- `apps/api/prisma/seed.ts` — Added `role: "ADMIN"` to admin user upsert

**E2E Test**
- `apps/api/e2e-pdf-test.ts` — Removed try/catch fallback that called non-existent `POST /auth/register`; now directly logs in as seed admin

**Docs**
- `README.md` — Added Roles & Access Control section documenting USER/ADMIN roles, seed credentials, user management, last-admin protection, token role refresh

### Build Results

- `pnpm --filter api build`: **ok** — clean TypeScript compilation
- `pnpm --filter web build`: **ok** — vue-tsc + vite build clean

### Verification Notes

**Build fixes applied during implementation:**
1. `refresh()` became async (DB re-read) but controller was calling it synchronously → fixed with `await`
2. Express 5 `req.params.id` typed as `string | string[]` → added Array.isArray guard in users controller
3. Prisma client needed regeneration after schema change → `prisma generate` before build

### Manual Smoke Test Plan (for orchestrator)

1. Apply migration: `pnpm --filter api prisma migrate dev`
2. Seed: `pnpm --filter api prisma db seed`
3. Login as admin (`admin`/`admin123`) → response includes `role: "ADMIN"`
4. `GET /api/auth/me` → returns `role: "ADMIN"`
5. `POST /api/users` (as ADMIN, body: `{username:"tech1",password:"password123",fullName:"Tech One"}`) → 201
6. Login as `tech1` → response includes `role: "USER"`
7. `POST /api/users` (as USER) → 403
8. `PATCH /api/users/:adminId/role` (as ADMIN, body: `{role:"USER"}`) → 409 (last admin)
9. `DELETE /api/users/:adminId` (as ADMIN) → 409 (last admin)
10. `POST /auth/register` → 404 (endpoint does not exist)

### Notes for Orchestrator

- **Error shape coexistence**: New middleware uses `{ error: { code, message } }` for RBAC errors. Existing error handler continues using flat `{ error: string }`. Both coexist — no migration of existing errors in PR-A.
- **createdById not yet set on create**: The `createdById` field exists on the schema but PR-A does NOT set it in create handlers. That wiring happens in PR-B (per-module guards). Existing records are backfilled to admin via migration SQL.
- **Maintenance ownership**: Uses `technicianId`, NOT `createdById`. This is accounted for in the design but not wired in PR-A.
- **Self-deletion guard**: Added `deleteUser` prevents self-deletion (not in original spec but is a logical safety guard alongside self-demotion prevention).

### Next Step

Awaiting merge confirmation. After merge, proceed to PR-B (guard DELETE endpoints + ownership checks).

---

## PR-B: 2026-06-30 — completed

### Branch
`slice-7/pr-b` (based on `master` at `22e84ff`, PR-A merged)

### Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `1b65812` | `feat(clients): add admin-only delete, ownership check on update, list filter` |
| 2 | `3b6f45e` | `feat(equipment): add admin-only delete, ownership check on update, list filter` |
| 3 | `8005c1f` | `feat(software): add admin-only delete and ownership check on update` |
| 4 | `6b63fcf` | `feat(templates): add admin-only delete and ownership check on update` |
| 5 | `c0b47ad` | `feat(attachments): add admin-only delete guard` |
| 6 | `b4696fe` | `feat(maintenances): add admin-only item delete and technician ownership check` |
| 7 | `83107cd` | `feat(action-types): admin-only write operations` |
| 8 | `b6c36fe` | `feat(equipment-categories): admin-only write operations` |

### Files Changed

**clients module**
- `apps/api/src/modules/clients/clients.service.ts` — `listClients` accepts optional `userId` param for scoping; `createClient` accepts optional `createdById` and passes it to Prisma create
- `apps/api/src/modules/clients/clients.controller.ts` — Added imports for `requireRole`, `requireOwnershipOrAdmin`, `prisma`; GET filters by `createdById` for USER; POST passes `req.user.userId` as `createdById`; PATCH wrapped with `requireOwnershipOrAdmin` checking `createdById`; DELETE wrapped with `requireRole("ADMIN")`

**equipment module**
- `apps/api/src/modules/equipment/equipment.service.ts` — `listEquipment` accepts optional `userId` for scoping; `createEquipment` accepts optional `createdById`
- `apps/api/src/modules/equipment/equipment.controller.ts` — Same guard pattern as clients: list filter, ownership check on PATCH, admin-only DELETE, createdById on POST

**software module**
- `apps/api/src/modules/software/software.service.ts` — `createSoftware` accepts optional `createdById`; `listSoftware` accepts optional `userId` filter
- `apps/api/src/modules/software/software.controller.ts` — Same guard pattern; GET list passes userId for USER scoping

**templates module**
- `apps/api/src/modules/templates/templates.service.ts` — `createTemplate` accepts optional `createdById`
- `apps/api/src/modules/templates/templates.controller.ts` — Same guard pattern: ownership on PATCH, admin-only DELETE, createdById on POST

**attachments module**
- `apps/api/src/modules/attachments/attachments.controller.ts` — Added `requireRole` import; DELETE wrapped with `requireRole("ADMIN")`

**maintenances module**
- `apps/api/src/modules/maintenances/maintenances.service.ts` — `listClientMaintenances` accepts optional `userId` param, filters by `technicianId` when present
- `apps/api/src/modules/maintenances/maintenances.controller.ts` — Added imports for `requireRole`, `requireOwnershipOrAdmin`, `prisma`; PATCH wrapped with `requireOwnershipOrAdmin` checking `technicianId`; DELETE item wrapped with `requireRole("ADMIN")`; close wrapped with `requireOwnershipOrAdmin` checking `technicianId`; list filters by `technicianId` for USER

**action-types module**
- `apps/api/src/modules/action-types/action-types.controller.ts` — Added `requireRole` import; POST, PATCH, DELETE wrapped with `requireRole("ADMIN")`

**equipment-categories module**
- `apps/api/src/modules/equipment-categories/equipment-categories.controller.ts` — Added `requireRole` import; POST, PATCH, DELETE wrapped with `requireRole("ADMIN")`

**push module** — No changes needed. DELETE subscription already scoped by `req.user.userId`.

**notifications module** — No changes needed. No DELETE endpoints exist.

**bulk-delete** — No bulk-delete endpoint found (deferred from slice 6-1). No action taken.

### Build Results

- `pnpm --filter api build`: **ok** — clean TypeScript compilation
- `pnpm --filter web build`: **ok** — vue-tsc + vite build clean

### Notes for Orchestrator

- **Error shape coexistence maintained**: All new guards use the nested `{ error: { code, message } }` shape from PR-A middleware. Existing handlers continue using flat `{ error: string }`. No migration of existing errors.
- **createdById set on create**: Every user-facing create handler (clients, equipment, software, templates) now passes `req.user.userId` as `createdById`. Maintenance already set `technicianId` on create (existing behavior).
- **Maintenance uses technicianId**: Ownership checks on maintenances use `technicianId`, NOT `createdById`. This is correct per design.
- **Push module safe**: DELETE subscription already filtered by `userId` — no additional guard needed.
- **No bulk-delete endpoint**: Grep confirmed no bulk-delete exists in the codebase. Will need ADMIN guard when built in a future slice.
- **Express 5 params pattern**: All param extraction uses the existing `getParam()` helper or `Array.isArray` guard that PR-A established.
- **Service layer changes are backward-compatible**: All new `createdById`/`userId` params are optional, so existing callers (tests, seeds) continue to work without changes.

### Manual Smoke Test Plan (for orchestrator)

1. Login as USER → `POST /api/clients` → 201 (created with `createdById` = user's id)
2. Login as USER → `GET /api/clients` → only own clients returned
3. Login as ADMIN → `GET /api/clients` → all clients returned
4. Login as USER → `DELETE /api/clients/:id` → 403
5. Login as ADMIN → `DELETE /api/clients/:id` → 204
6. Login as USER → `PUT /api/clients/:id` (own client) → 200
7. Login as USER → `PUT /api/clients/:id` (other's client) → 403
8. Same pattern for equipment, software, templates (replace "clients" with each module)
9. Login as USER → `DELETE /api/attachments/:id` → 403
10. Login as USER → `DELETE /api/maintenances/:id/items/:itemId` → 403
11. Login as USER → `PATCH /api/maintenances/:id` (own maintenance) → 200
12. Login as USER → `PATCH /api/maintenances/:id` (other's maintenance) → 403
13. Login as USER → `POST /api/maintenances/:id/close` (own) → 200
14. Login as USER → `POST /api/maintenances/:id/close` (other's) → 403
15. Login as USER → `POST /api/action-types` → 403
16. Login as ADMIN → `POST /api/action-types` → 201
17. Login as USER → `POST /api/equipment-categories` → 403
18. Login as ADMIN → `POST /api/equipment-categories` → 201

### Next Step

Awaiting merge confirmation. After merge, proceed to PR-C (frontend role-aware UI).

---

## PR-C: 2026-06-30 — completed

### Branch
`slice-7/pr-c` (based on `master` at `108c478`, PR-A + PR-B merged)

### Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `eaedee9` | `feat(auth-store): add role helpers (isAdmin, canEdit, canDelete) and useAuth composable` |
| 2 | `dae54cb` | `feat(views): gate delete and edit buttons by role in views and shared components` |
| 3 | `33dc038` | `feat(components): gate delete buttons by role in shared components` |
| 4 | `5a627b8` | `feat(admin): add user management page, users store, admin nav, and router guard` |
| 5 | `f2c1d21` | `fix(types): add createdById to domain models and fix dynamic import in UserCreateForm` |

### Files Changed

**Auth Store & Composable**
- `apps/web/src/stores/auth.ts` — Added `role`, `isAdmin` computeds, `canEdit(resource)`, `canDelete()` functions
- `apps/web/src/composables/useAuth.ts` — New composable wrapping auth store with role helpers

**Shared Types**
- `packages/types/src/models.ts` — Added `createdById: string | null` to Client, Equipment, Software, Template, Attachment interfaces

**Views with v-if guards**
- `apps/web/src/views/ClientListPage.vue` — Gated "Nuevo cliente" button and empty-state create button with `v-if="auth.isAdmin"`
- `apps/web/src/views/ClientDetailPage.vue` — Gated "Editar" button with `v-if="auth.canEdit(client)"`, "Eliminar" button with `v-if="auth.isAdmin"`, software edit/delete buttons similarly
- `apps/web/src/views/MaintenanceFlowPage.vue` — Passed `:is-admin="auth.isAdmin"` to ItemCard, `:can-remove="auth.isAdmin"` to PhotoUpload

**Components with v-if guards**
- `apps/web/src/components/clients/ClientCard.vue` — Gated delete menu item with `v-if="auth.isAdmin"`
- `apps/web/src/components/equipment/EquipmentList.vue` — Gated delete button with `v-if="auth.isAdmin"`
- `apps/web/src/components/equipment/EquipmentForm.vue` — Gated category create (+) button, gear icon (category manager), and edit/delete buttons inside category manager modal with `v-if="auth.isAdmin"`
- `apps/web/src/components/maintenance/PhotoUpload.vue` — Added `canRemove` prop; remove button gated by `canRemove !== false`
- `apps/web/src/components/maintenance/ItemCard.vue` — Added `isAdmin` prop; added remove button gated by `isAdmin`; passed `canRemove` to PhotoUpload

**Admin User Management (new)**
- `apps/web/src/stores/users.ts` — New Pinia store: `fetchUsers()`, `createUser()`, `updateUserRole()`, `deleteUser()`
- `apps/web/src/components/admin/UserList.vue` — User list with role badges, role change dropdown, delete button
- `apps/web/src/components/admin/UserCreateForm.vue` — Create form with username, password, fullName, role select
- `apps/web/src/views/AdminUsersPage.vue` — Page composing UserList + UserCreateForm, error handling for LAST_ADMIN

**Router & Navigation**
- `apps/web/src/router/index.ts` — Added `/admin/users` route with `meta: { requiresAdmin: true }`; added `requiresAdmin` guard in `beforeEach`
- `apps/web/src/components/layout/AppNav.vue` — Added "Usuarios" nav item with `adminOnly: true`; filtered by `auth.isAdmin`

### Build Results

- `pnpm --filter api build`: **ok** — clean TypeScript compilation
- `pnpm --filter web build`: **ok** — vue-tsc + vite build clean

### Components Gated (v-if applied)

| Component/View | What was gated | Condition |
|----------------|---------------|-----------|
| `ClientListPage.vue` | "Nuevo cliente" button | `v-if="auth.isAdmin"` |
| `ClientListPage.vue` | Empty-state "Crear primer cliente" button | `v-if="auth.isAdmin"` |
| `ClientDetailPage.vue` | "Editar" client button | `v-if="auth.canEdit(client)"` |
| `ClientDetailPage.vue` | "Eliminar" client button | `v-if="auth.isAdmin"` |
| `ClientDetailPage.vue` | Software edit button | `v-if="auth.canEdit(sw)"` |
| `ClientDetailPage.vue` | Software delete button | `v-if="auth.isAdmin"` |
| `ClientCard.vue` | Delete menu item | `v-if="auth.isAdmin"` |
| `EquipmentList.vue` | Delete button per equipment | `v-if="auth.isAdmin"` |
| `EquipmentForm.vue` | Create category (+) button | `v-if="auth.isAdmin"` |
| `EquipmentForm.vue` | Gear icon (category manager) | `v-if="auth.isAdmin"` |
| `EquipmentForm.vue` | Edit category button in modal | `v-if="auth.isAdmin"` |
| `EquipmentForm.vue` | Delete category button in modal | `v-if="auth.isAdmin"` |
| `ItemCard.vue` | Remove item button (new) | `v-if="isAdmin"` (via prop) |
| `PhotoUpload.vue` | Remove attachment button | `canRemove` prop (defaults true) |
| `MaintenanceFlowPage.vue` | General photo remove | `:can-remove="auth.isAdmin"` |
| `AppNav.vue` | "Usuarios" nav item | `adminOnly` filtered by `auth.isAdmin` |

### Verification Notes

**Build fixes applied during implementation:**
1. `Client` type missing `createdById` field (PR-A added it to schema but not to frontend types) → added `createdById: string | null` to Client, Equipment, Software, Template, Attachment interfaces
2. Dynamic import of `useUsersStore` in `UserCreateForm.vue` caused vite chunk warning → changed to static import

### Manual Smoke Test Plan (for orchestrator)

1. Login as USER → no delete buttons visible in any component (ClientCard, ClientDetailPage, EquipmentList, EquipmentForm, MaintenanceFlowPage)
2. Login as USER → no "Nuevo cliente" button visible
3. Login as USER → no admin nav link ("Usuarios") visible
4. Login as USER → try to navigate to `/admin/users` manually → redirected to `/clients`
5. Login as ADMIN → delete buttons visible everywhere
6. Login as ADMIN → "Nuevo cliente" button visible
7. Login as ADMIN → "Usuarios" nav item visible
8. Login as ADMIN → `/admin/users` shows user list
9. Login as ADMIN → create a USER via form → 201, appears in list
10. Login as ADMIN → change a USER's role to ADMIN via dropdown → 200
11. Login as ADMIN → try to demote self (last admin) → error "No se puede cambiar el rol del último administrador"
12. Login as ADMIN → delete a non-admin USER → 200, removed from list
13. Login as ADMIN → try to delete self → blocked by backend (self-deletion guard)
14. Login as ADMIN → EquipmentForm category manager: gear icon, create button, edit/delete buttons inside modal all visible
15. Login as USER → EquipmentForm: no gear icon, no create category button visible

### Notes for Orchestrator

- **createdById type gap fixed**: PR-A added `createdById` to the Prisma schema but didn't update the TypeScript types in `packages/types`. This PR fixes that — `Client`, `Equipment`, `Software`, `Template`, `Attachment` all now have `createdById: string | null`.
- **canEdit logic**: `canEdit(resource)` returns true if ADMIN, or if `resource.createdById === currentUser.id` or `resource.technicianId === currentUser.id`. This covers the maintenance ownership case (technicianId) and the general ownership case (createdById).
- **canDelete is ADMIN-only**: Per spec, USER can never delete. `canDelete()` simply returns `isAdmin`.
- **PhotoUpload canRemove prop**: Added a new `canRemove` prop (defaults to `true` for backward compatibility) to separately gate the remove button without affecting the upload dropzone. This allows non-admins to still upload photos but not remove them.
- **ItemCard remove button**: Added a remove button to ItemCard (was missing from template despite having the emit). Gated by `isAdmin` prop.
- **Admin page error handling**: Displays `{ error: { code, message } }` from the new middleware. LAST_ADMIN errors show a user-friendly Spanish message.
- **Router guard**: `/admin/users` route redirects to `/clients` if user is not ADMIN.

### Next Step

Awaiting merge confirmation. This is the last PR for slice 7. After merge, proceed to sdd-verify and sdd-archive.
