# Tasks: Multi-User RBAC (Slice 7)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,450 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR-A → PR-B → PR-C |
| Delivery strategy | stacked-to-main |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + auth + middleware + users module | PR-A (~700 lines) | Base: main. Foundation. All subsequent work depends on this. |
| 2 | Protect DELETE endpoints + ownership checks | PR-B (~350 lines) | Base: main (after PR-A). Mechanical per-module guards. |
| 3 | Frontend role-aware UI + admin page | PR-C (~400 lines) | Base: main (after PR-A). v-if guards + admin view. |

---

## PR-A: Schema + Auth + Middleware + Users Module (~700 lines, LOW risk) ✅ COMPLETED 2026-06-30

### A.1 Prisma schema: UserRole enum + User.role + createdById on 5 models ✅

- **Start**: `apps/api/prisma/schema.prisma` at commit `0688243` — no UserRole, no createdById
- **Finish**: `schema.prisma` has `enum UserRole { USER ADMIN }`, `User.role` field, `createdById` + `createdBy` relation on Client/Equipment/Software/Template/Attachment. Migration file generated with raw SQL for role UPDATE + createdById backfill
- **Verification**: `pnpm --filter api prisma migrate dev --name add_user_role_and_created_by` succeeds. Inspect migration SQL for backfill logic
- **Rollback**: `pnpm --filter api prisma migrate reset` or drop migration folder
- **Commit**: `feat(schema): add UserRole enum and createdById ownership fields`

### A.2 Update `packages/types/src/models.ts` — add UserRole type + role on User ✅

- **Start**: `packages/types/src/models.ts` — User interface has no `role`, no `UserRole` type
- **Finish**: `UserRole` type exported (`"USER" | "ADMIN"`), `User.role: UserRole` added to interface
- **Verification**: `pnpm --filter @mantenti/types build` succeeds (or `tsc --noEmit` in packages/types)
- **Rollback**: Revert file
- **Commit**: `feat(types): add UserRole type and role field to User interface`

### A.3 Update `apps/api/src/modules/auth/auth.service.ts` — include role in JWT ✅

- **Start**: `auth.service.ts` — `TokenPayload` has only `userId` + `username`, `sanitizeUser` omits role
- **Finish**: `TokenPayload` adds `role: UserRole`. `sanitizeUser` includes `role`. `login()` builds payload with `role`. `refresh()` re-reads user from DB and uses fresh `role` in new access token
- **Verification**: Build passes (`pnpm --filter api build`). Manual: login returns `role` in user object
- **Rollback**: Revert file
- **Commit**: `feat(auth): include role in JWT access token and refresh re-reads`

### A.4 Update `apps/api/src/middleware/auth.ts` — add role to req.user + requireRole + requireOwnershipOrAdmin ✅

- **Start**: `middleware/auth.ts` — `req.user` has `{ userId, username }`, no role, no middleware factories
- **Finish**: `req.user` adds `role: UserRole`. Export `requireRole(...allowedRoles: UserRole[]): RequestHandler`. Export `requireOwnershipOrAdmin(getOwnerId: (req) => Promise<string | null>): RequestHandler`. Both use nested `{ error: { code, message } }` shape
- **Verification**: Build passes. `requireRole("ADMIN")` returns 403 for non-admin. `requireOwnershipOrAdmin` returns 404 if resource missing, 403 if not owner
- **Rollback**: Revert file
- **Commit**: `feat(middleware): add role to req.user, requireRole and requireOwnershipOrAdmin factories`

### A.5 Create `apps/api/src/modules/users/users.schema.ts` ✅

- **Start**: File does not exist
- **Finish**: Zod schemas: `createUserSchema` (username, password, fullName, optional role), `updateUserRoleSchema` (role). Both use `.strict()`. Export `CreateUserInput` and `UpdateUserRoleInput` types
- **Verification**: `pnpm --filter api build` succeeds
- **Rollback**: Delete file
- **Commit**: `feat(users): add Zod validation schemas for user CRUD`

### A.6 Create `apps/api/src/modules/users/users.service.ts` ✅

- **Start**: File does not exist
- **Finish**: `listUsers()`, `createUser(input)` (argon2 hash, unique check), `updateUserRole(userId, newRole, requesterId)` (self-demotion block, last-admin guard via `$transaction` count), `deleteUser(userId, requesterId)` (last-admin guard). `sanitizeUser()` helper excludes passwordHash
- **Verification**: `pnpm --filter api build` succeeds
- **Rollback**: Delete file
- **Commit**: `feat(users): implement user CRUD service with last-admin protection`

### A.7 Create `apps/api/src/modules/users/users.controller.ts` ✅

- **Start**: File does not exist
- **Finish**: Router with `authMiddleware` + `requireRole("ADMIN")` on all routes. `GET /` → listUsers, `POST /` → createUser (201), `PATCH /:id/role` → updateUserRole, `DELETE /:id` → deleteUser (204). Error shape: `{ error: { code, message } }`
- **Verification**: `pnpm --filter api build` succeeds. Manual: `POST /api/users` as ADMIN → 201, as USER → 403
- **Rollback**: Delete file
- **Commit**: `feat(users): add admin-only user management endpoints`

### A.8 Mount `/api/users` in `apps/api/src/index.ts` ✅

- **Start**: `index.ts` — no usersRouter import
- **Finish**: Import `usersRouter`, mount `app.use("/api/users", usersRouter)` after existing routes
- **Verification**: `pnpm --filter api build` succeeds. `GET /api/users` returns 401 without token
- **Rollback**: Revert file
- **Commit**: `feat(api): mount users router at /api/users`

### A.9 Update `apps/api/prisma/seed.ts` — add role to admin user ✅

- **Start**: `seed.ts` — admin create block has no `role` field
- **Finish**: Add `role: "ADMIN"` to admin user upsert create block
- **Verification**: `pnpm --filter api prisma db seed` succeeds. Query users table: admin has role ADMIN
- **Rollback**: Revert file
- **Commit**: `feat(seed): set admin user role to ADMIN`

### A.10 Update `apps/api/e2e-pdf-test.ts` — remove register fallback ✅

- **Start**: `e2e-pdf-test.ts` lines 192-201 — tries `POST /auth/register` on login failure
- **Finish**: Remove the try/catch fallback. Login as seed admin directly (`POST /auth/login` with `admin`/`admin123`). If login fails, throw (seed must exist)
- **Verification**: `pnpm --filter api build` succeeds. E2E test runs without referencing non-existent register endpoint
- **Rollback**: Revert file
- **Commit**: `fix(test): remove non-existent register fallback from e2e test`

### A.11 Update `README.md` — document role model ✅

- **Start**: `README.md` — no mention of roles or multi-user
- **Finish**: Add section documenting: USER/ADMIN roles, seed credentials, 15-min demotion window, admin-only user management
- **Verification**: Markdown renders correctly
- **Rollback**: Revert file
- **Commit**: `docs: document RBAC role model and admin user management`

### A.12 PR-A merge verification ✅

- **Start**: All A.1-A.11 merged to main
- **Finish**: `pnpm --filter api build` passes. `pnpm --filter web build` passes. Manual smoke: login as admin shows `role: "ADMIN"`, POST /api/users creates user, POST /api/users as USER returns 403
- **Verification**: Both builds green. Login response includes role. Users endpoint works
- **Rollback**: Revert PR-A commit
- **Commit**: `chore: merge PR-A (schema + auth + users module)`

---

## PR-B: Protect DELETE Endpoints + Ownership Checks (~350 lines, HIGH risk)

### B.1 Guard clients module — DELETE + PATCH ownership + list filter

- **Start**: `clients.controller.ts` — DELETE at line 76 has no guard, PATCH at line 65 has no ownership check, GET list at line 19 has no filter
- **Finish**: `DELETE /:id` gets `requireRole("ADMIN")` middleware. `PATCH /:id` gets `requireOwnershipOrAdmin(async (req) => { const c = await prisma.client.findUnique({where:{id:req.params.id}}); return c?.createdById ?? null; })`. `GET /` filters by `createdById` when `req.user?.role === "USER"` (returns all for ADMIN)
- **Verification**: Build passes. USER DELETE → 403. USER PATCH other's client → 403. USER PATCH own client → 200. USER GET → only own clients. ADMIN GET → all clients
- **Rollback**: Revert file
- **Commit**: `feat(clients): add admin-only delete, ownership check on update, list filter`

### B.2 Guard equipment module — DELETE + PATCH ownership + list filter

- **Start**: `equipment.controller.ts` — DELETE at line 76, PATCH at line 61, GET at line 19
- **Finish**: Same pattern as B.1. DELETE gets `requireRole("ADMIN")`. PATCH gets `requireOwnershipOrAdmin` via `prisma.equipment.findUnique`. GET filters by `createdById` for USER
- **Verification**: Build passes. USER DELETE → 403. USER PATCH other's equipment → 403. USER GET → only own equipment
- **Rollback**: Revert file
- **Commit**: `feat(equipment): add admin-only delete, ownership check on update, list filter`

### B.3 Guard software module — DELETE + PATCH ownership

- **Start**: `software.controller.ts` — DELETE at line 80, PATCH at line 65
- **Finish**: DELETE gets `requireRole("ADMIN")`. PATCH gets `requireOwnershipOrAdmin` via `prisma.software.findUnique` returning `createdById`
- **Verification**: Build passes. USER DELETE → 403. USER PATCH other's software → 403
- **Rollback**: Revert file
- **Commit**: `feat(software): add admin-only delete and ownership check on update`

### B.4 Guard templates module — DELETE + PATCH ownership

- **Start**: `templates.controller.ts` — DELETE at line 76, PATCH at line 64
- **Finish**: DELETE gets `requireRole("ADMIN")`. PATCH gets `requireOwnershipOrAdmin` via `prisma.template.findUnique` returning `createdById`
- **Verification**: Build passes. USER DELETE → 403. USER PATCH other's template → 403
- **Rollback**: Revert file
- **Commit**: `feat(templates): add admin-only delete and ownership check on update`

### B.5 Guard attachments module — DELETE only

- **Start**: `attachments.controller.ts` — DELETE at line 93
- **Finish**: DELETE gets `requireRole("ADMIN")`. No PATCH exists (attachments are immutable)
- **Verification**: Build passes. USER DELETE → 403
- **Rollback**: Revert file
- **Commit**: `feat(attachments): add admin-only delete guard`

### B.6 Guard maintenances module — DELETE item + ownership on PATCH

- **Start**: `maintenances.controller.ts` — DELETE at line 95 (items), PATCH at line 64, POST at line 36
- **Finish**: `DELETE /:id/items/:itemId` gets `requireRole("ADMIN")`. `PATCH /:id` gets `requireOwnershipOrAdmin` via `prisma.maintenance.findUnique` returning `technicianId` (not createdById). `POST /` (create) stays open — any authenticated user can create a maintenance
- **Verification**: Build passes. USER DELETE item → 403. USER PATCH other's maintenance → 403. USER PATCH own maintenance (technicianId match) → 200
- **Rollback**: Revert file
- **Commit**: `feat(maintenances): add admin-only item delete and technician ownership check`

### B.7 Guard action-types module — admin-only CRUD

- **Start**: `action-types.controller.ts` — POST at line 23, PATCH at line 44, DELETE at line 55
- **Finish**: POST gets `requireRole("ADMIN")`. PATCH gets `requireRole("ADMIN")`. DELETE gets `requireRole("ADMIN")`. GET stays open (catalog is read-only for USER)
- **Verification**: Build passes. USER POST → 403. USER PATCH → 403. USER DELETE → 403. USER GET → 200
- **Rollback**: Revert file
- **Commit**: `feat(action-types): admin-only write operations`

### B.8 Guard equipment-categories module — admin-only CRUD

- **Start**: `equipment-categories.controller.ts` — POST at line 28, PATCH at line 53, DELETE at line 68
- **Finish**: POST gets `requireRole("ADMIN")`. PATCH gets `requireRole("ADMIN")`. DELETE gets `requireRole("ADMIN")`. GET stays open
- **Verification**: Build passes. USER POST → 403. USER PATCH → 403. USER DELETE → 403. USER GET → 200
- **Rollback**: Revert file
- **Commit**: `feat(equipment-categories): admin-only write operations`

### B.9 Guard push module — ownership on unsubscribe

- **Start**: `push.controller.ts` — DELETE at line 89 scopes by `req.user!.userId` already
- **Finish**: No change needed — DELETE already scopes by userId. Confirm the ownership check is correct (user can only delete own subscription). If desired, add explicit `requireOwnershipOrAdmin` for consistency, but current pattern is safe
- **Verification**: Build passes. USER DELETE other's subscription → 404 (not found, since query filters by userId)
- **Rollback**: Revert file
- **Commit**: `chore(push): verify delete already scoped by userId`

### B.10 Confirm notifications module — no DELETE endpoints

- **Start**: `notifications.controller.ts` — GET, PATCH, POST (read-all, preferences). No DELETE
- **Finish**: No changes needed. Notifications have no DELETE endpoint
- **Verification**: Build passes unchanged
- **Rollback**: N/A
- **Commit**: N/A (no commit needed)

### B.11 Confirm admin-bulk-delete (slice 6-1 carryover)

- **Start**: Check if bulk-delete endpoint exists in any controller
- **Finish**: If bulk-delete exists in any module, add `requireRole("ADMIN")`. If not (deferred from slice 6-1), no action needed
- **Verification**: Grep for `bulk` or `DELETE` across all controllers. Verify all DELETE routes have guards
- **Rollback**: N/A
- **Commit**: `feat(bulk): add admin-only guard to bulk delete if present`

### B.12 PR-B merge verification

- **Start**: All B.1-B.11 merged to main
- **Finish**: `pnpm --filter api build` passes. Manual smoke: USER DELETE on every module → 403. USER PUT on other's record → 403. USER GET → only own records. ADMIN → full access
- **Verification**: Both builds green. All DELETE endpoints return 403 for USER. Ownership checks work
- **Rollback**: Revert PR-B commit
- **Commit**: `chore: merge PR-B (RBAC guards on all endpoints)`

---

## PR-C: Frontend Role-Aware UI (~400 lines, MEDIUM risk)

### C.1 Update `apps/web/src/stores/auth.ts` — add role helpers

- **Start**: `stores/auth.ts` — no role computed, no canEdit/canDelete
- **Finish**: Add `isAdmin = computed(() => user.value?.role === "ADMIN")`, `canEdit(resource)`, `canDelete()`. Export all from store return
- **Verification**: `pnpm --filter web build` succeeds
- **Rollback**: Revert file
- **Commit**: `feat(auth-store): add role helpers (isAdmin, canEdit, canDelete)`

### C.2 Create `apps/web/src/composables/useAuth.ts`

- **Start**: File does not exist (composables dir has `usePhotoResize.ts`, `usePushSubscription.ts`)
- **Finish**: Composable wrapping auth store: `useAuth()` returns `{ user, isAdmin, role, canEdit, canDelete, login, logout }`
- **Verification**: `pnpm --filter web build` succeeds
- **Rollback**: Delete file
- **Commit**: `feat(composable): add useAuth composable for role helpers`

### C.3 Add v-if guards to views — ClientListPage, ClientDetailPage, MaintenanceFlowPage

- **Start**: Delete buttons visible to all users in these views
- **Finish**:
  - `ClientListPage.vue`: Gate the delete emit on `@delete="handleDelete"` — conditionally pass handler or null. Gate the "Nuevo cliente" button with `v-if="auth.isAdmin"` (USER can still view clients but not create)
  - `ClientDetailPage.vue`: Gate "Eliminar" button (line 311-321) with `v-if="auth.isAdmin"`. Gate "Editar" button (line 301-310) with `v-if="auth.canEdit(client)"`. Gate software delete button (line 576-585) with `v-if="auth.isAdmin"`
  - `MaintenanceFlowPage.vue`: Gate remove-item button in ItemCard with prop `:can-remove="auth.isAdmin"`. Gate remove-attachment buttons in PhotoUpload with `:disabled="!auth.isAdmin"`
- **Verification**: `pnpm --filter web build` succeeds. USER role: delete buttons hidden. ADMIN role: all visible
- **Rollback**: Revert all three files
- **Commit**: `feat(views): gate delete and edit buttons by role`

### C.4 Add v-if guards to components — ClientCard, EquipmentList, EquipmentForm, PhotoUpload

- **Start**: Delete buttons visible to all users in these components
- **Finish**:
  - `ClientCard.vue`: Gate delete menu item (line 143-153) with `v-if="auth.isAdmin"`
  - `EquipmentList.vue`: Gate delete button (line 232-241) with `v-if="auth.isAdmin"`
  - `EquipmentForm.vue`: Gate category manager edit/delete buttons (line 641-659) with `v-if="auth.isAdmin"` on each action button. Gate gear icon to open category manager with `v-if="auth.isAdmin"`
  - `PhotoUpload.vue`: Gate remove button (line 202-213) — add `:disabled` prop or `v-if="auth.isAdmin"`
- **Verification**: `pnpm --filter web build` succeeds. USER: no delete UI visible. ADMIN: all visible
- **Rollback**: Revert all four files
- **Commit**: `feat(components): gate delete buttons by role in shared components`

### C.5 Create `apps/web/src/stores/users.ts` — Pinia store for user CRUD

- **Start**: File does not exist
- **Finish**: Pinia store with `fetchUsers()`, `createUser(data)`, `updateUserRole(id, role)`, `deleteUser(id)`. All call `/api/users` endpoints
- **Verification**: `pnpm --filter web build` succeeds
- **Rollback**: Delete file
- **Commit**: `feat(users-store): add Pinia store for admin user management`

### C.6 Create `apps/web/src/components/users/UserList.vue`

- **Start**: File does not exist
- **Finish**: Table component showing users (username, fullName, role, createdAt). Role change dropdown inline. Delete button with confirmation. Emit `role-changed` and `deleted` events
- **Verification**: `pnpm --filter web build` succeeds
- **Rollback**: Delete file
- **Commit**: `feat(users): add UserList component for admin view`

### C.7 Create `apps/web/src/components/users/UserCreateForm.vue`

- **Start**: File does not exist
- **Finish**: Form with username, password, fullName, role (select). Submit calls store.createUser. Emit `created` on success
- **Verification**: `pnpm --filter web build` succeeds
- **Rollback**: Delete file
- **Commit**: `feat(users): add UserCreateForm component`

### C.8 Create `apps/web/src/views/AdminUsersPage.vue`

- **Start**: File does not exist
- **Finish**: Page composing UserCreateForm + UserList. Fetches users on mount. Refreshes on create/role-change/delete events
- **Verification**: `pnpm --filter web build` succeeds. Navigate to `/admin/users` as ADMIN → page loads. As USER → redirected to /clients
- **Rollback**: Delete file
- **Commit**: `feat(admin): add AdminUsersPage view for user management`

### C.9 Update `apps/web/src/router/index.ts` — add admin route + guard

- **Start**: `router/index.ts` — no admin routes
- **Finish**: Add `{ path: "/admin/users", name: "admin-users", component: () => import("@/views/AdminUsersPage.vue"), meta: { requiresAuth: true, requiresAdmin: true } }`. In `beforeEach`, add guard: `if (to.meta.requiresAdmin && auth.user?.role !== "ADMIN") return { name: "clients" }`
- **Verification**: `pnpm --filter web build` succeeds. USER navigating to `/admin/users` → redirected to `/clients`
- **Rollback**: Revert file
- **Commit**: `feat(router): add admin users route with role guard`

### C.10 Update `apps/web/src/components/layout/AppNav.vue` — add admin nav item

- **Start**: `AppNav.vue` — only "Clientes" and "Inventario" nav items, hardcoded array
- **Finish**: Import `useAuthStore`. Add "Usuarios" nav item with `v-if="auth.isAdmin"` to navItems array (or conditionally filter). Icon: users/people SVG path
- **Verification**: `pnpm --filter web build` succeeds. ADMIN sees "Usuarios" in nav. USER does not
- **Rollback**: Revert file
- **Commit**: `feat(nav): add admin-only Usuarios nav item`

### C.11 PR-C merge verification

- **Start**: All C.1-C.10 merged to main
- **Finish**: `pnpm --filter web build` passes. Manual smoke: USER hides delete buttons. ADMIN shows them. Admin view works. Role change works
- **Verification**: Both builds green. Full role-aware UI smoke test
- **Rollback**: Revert PR-C commit
- **Commit**: `chore: merge PR-C (frontend role-aware UI)`

---

## Dependencies

- **PR-B depends on PR-A**: `requireRole` and `requireOwnershipOrAdmin` must exist (A.4). `createdById` must exist on models (A.1). `UserRole` type must exist (A.2).
- **PR-C depends on PR-A**: Frontend reads `role` from auth response (A.3). `UserRole` type in packages/types (A.2). Backend `/api/users` endpoints (A.5-A.8).
- **PR-B and PR-C are independent**: Both only depend on PR-A. Could be done in parallel, but sequential A→B→C is recommended for risk control (lock backend before hiding frontend buttons).

## Key Design Notes for Implementer

1. **Error shape**: New middleware (`requireRole`, `requireOwnershipOrAdmin`) uses `{ error: { code, message } }` nested shape. Existing error-handler uses flat `{ error: string }`. Both coexist — don't migrate existing errors in this slice.

2. **createdById SET ON CREATE**: When a USER creates a client/equipment/software/template/attachment, the controller/service MUST set `createdById: req.user.userId`. This is NOT automatic — the create service functions must be updated to accept and pass through the userId. This is implicit in the ownership model but must be implemented in each module's create handler.

3. **Maintenance ownership**: Uses existing `technicianId` field, NOT `createdById`. The `POST /maintenances` already sets `technicianId: req.user!.userId` (line 41 of maintenances.controller.ts).

4. **Frontend auth store shape**: The `auth.ts` store's `login()` response type must match the backend's `sanitizeUser` output which now includes `role`. The `User` type in `packages/types` (updated in A.2) drives this.

5. **Category manager in EquipmentForm**: The gear icon and edit/delete buttons inside the category manager modal (lines 641-659) need `v-if="auth.isAdmin"` gating. The gear icon itself (which opens the modal) should also be ADMIN-only.
