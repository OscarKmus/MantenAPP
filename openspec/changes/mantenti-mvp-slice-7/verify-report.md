# Verification Report: mantenti-mvp-slice-7

## Change
Multi-User RBAC (Slice 7) — Role-based access control, ownership guards, user management.

## Mode
Standard verify (strict_tdd: false, no test runner). Build verification = typecheck only.

## Persistence Mode
Hybrid (Engram + OpenSpec file)

---

## 1. Build Status

| Command | Status | Details |
|---------|--------|---------|
| `pnpm --filter api build` | **OK** | Clean TypeScript compilation (tsc) |
| `pnpm --filter web build` | **OK** | vue-tsc + vite build clean, 148 modules, 2.27s |

---

## 2. Decision Verification

### Decision 1: USER edit scope — Own records only ✅ PASS

| Check | Status | Evidence |
|-------|--------|----------|
| `requireOwnershipOrAdmin` on clients PATCH | ✅ | `clients.controller.ts:70` — checks `createdById` |
| `requireOwnershipOrAdmin` on equipment PATCH | ✅ | `equipment.controller.ts:66` — checks `createdById` |
| `requireOwnershipOrAdmin` on software PATCH | ✅ | `software.controller.ts:70` — checks `createdById` |
| `requireOwnershipOrAdmin` on templates PATCH | ✅ | `templates.controller.ts:65` — checks `createdById` |
| `requireOwnershipOrAdmin` on maintenances PATCH | ✅ | `maintenances.controller.ts:68` — checks `technicianId` |
| `requireOwnershipOrAdmin` on maintenances close | ✅ | `maintenances.controller.ts:120` — checks `technicianId` |
| ADMIN bypasses ownership | ✅ | `middleware/auth.ts:70` — `if (req.user.role === "ADMIN") next()` |
| USER PATCH other's record → 403 | ✅ | `middleware/auth.ts:84-86` |
| List filters scope to own for USER | ✅ | `clients.controller.ts:23`, `equipment.controller.ts:27`, `software.controller.ts:32`, `maintenances.controller.ts:199` |
| List returns all for ADMIN | ✅ | Same lines — `userId` is `undefined` for ADMIN |

### Decision 2: Migration default — USER default, admin → ADMIN ✅ PASS

| Check | Status | Evidence |
|-------|--------|----------|
| `UserRole` enum in schema | ✅ | `schema.prisma:11-14` — `enum UserRole { USER ADMIN }` |
| `User.role` field with default USER | ✅ | `schema.prisma:21` — `role UserRole @default(USER)` |
| Migration SQL exists | ✅ | `migrations/20260630000000_add_user_role_and_created_by/migration.sql` |
| Migration UPDATE on seed admin | ✅ | `migration.sql:33` — `UPDATE "users" SET "role" = 'ADMIN' WHERE "username" = 'admin'` |
| Backfill createdById | ✅ | `migration.sql:36-47` — DO block with admin_id lookup |
| Seed creates admin with ADMIN | ✅ | `seed.ts:17` — `role: "ADMIN"` |
| `packages/types` has UserRole | ✅ | `models.ts:3` — `export type UserRole = "USER" \| "ADMIN"` |
| User interface has role | ✅ | `models.ts:29` — `role: UserRole` |

### Decision 3: Registration — Admin-only ✅ PASS

| Check | Status | Evidence |
|-------|--------|----------|
| No public `/auth/register` endpoint | ✅ | `auth.controller.ts` — only login, logout, me, refresh |
| `POST /api/users` is admin-only | ✅ | `users.controller.ts:11` — `requireRole("ADMIN")` on all routes |
| e2e test uses admin login | ✅ | `e2e-pdf-test.ts:186-190` — direct login, no register fallback |

### Decision 4: USER work scope — No DELETE ✅ PASS

| Endpoint | Guard | Evidence |
|----------|-------|----------|
| `DELETE /api/clients/:id` | `requireRole("ADMIN")` | `clients.controller.ts:87` |
| `DELETE /api/equipment/:id` | `requireRole("ADMIN")` | `equipment.controller.ts:83` |
| `DELETE /api/software/:id` | `requireRole("ADMIN")` | `software.controller.ts:87` |
| `DELETE /api/templates/:id` | `requireRole("ADMIN")` | `templates.controller.ts:84` |
| `DELETE /api/attachments/:id` | `requireRole("ADMIN")` | `attachments.controller.ts:95` |
| `DELETE /api/maintenances/:id/items/:itemId` | `requireRole("ADMIN")` | `maintenances.controller.ts:103` |
| `DELETE /api/action-types/:id` | `requireRole("ADMIN")` | `action-types.controller.ts:55` |
| `DELETE /api/equipment-categories/:id` | `requireRole("ADMIN")` | `equipment-categories.controller.ts:70` |
| `DELETE /api/push/subscriptions/:endpoint` | Scoped by userId | `push.controller.ts:93-97` |

### Decision 5: UI hide vs disable — v-if ✅ PASS

16 v-if guards applied across all components:

| Component | What | Condition | Evidence |
|-----------|------|-----------|----------|
| ClientListPage | "Nuevo cliente" button | `v-if="auth.isAdmin"` | Line 52 |
| ClientListPage | Empty-state create | `v-if="...&& auth.isAdmin"` | Line 136 |
| ClientDetailPage | "Editar" button | `v-if="auth.canEdit(client)"` | Line 304 |
| ClientDetailPage | "Eliminar" button | `v-if="auth.isAdmin"` | Line 315 |
| ClientDetailPage | Software edit | `v-if="auth.canEdit(sw as any)"` | Line 571 |
| ClientDetailPage | Software delete | `v-if="auth.isAdmin"` | Line 582 |
| ClientCard | Delete menu item | `v-if="auth.isAdmin"` | Line 147 |
| EquipmentList | Delete button | `v-if="auth.isAdmin"` | Line 236 |
| EquipmentForm | Create category (+) | `v-if="auth.isAdmin"` | Line 311 |
| EquipmentForm | Gear icon | `v-if="auth.isAdmin"` | Line 323 |
| EquipmentForm | Edit category | `v-if="auth.isAdmin"` | Line 647 |
| EquipmentForm | Delete category | `v-if="auth.isAdmin"` | Line 657 |
| ItemCard | Remove item button | `v-if="isAdmin"` (prop) | Line 108 |
| PhotoUpload | Remove attachment | `canRemove !== false` (prop) | Line 204 |
| MaintenanceFlowPage | General photo remove | `:can-remove="auth.isAdmin"` | Line 342 |
| AppNav | "Usuarios" nav item | `adminOnly` filtered by `auth.isAdmin` | Line 58 |

### Decision 6: Admin role management ✅ PASS

| Check | Status | Evidence |
|-------|--------|----------|
| Self-demotion blocked | ✅ | `users.service.ts:82` — `if (userId === requesterId && newRole !== "ADMIN")` |
| Self-deletion blocked | ✅ | `users.service.ts:98` — `if (userId === requesterId)` |
| Last-admin demotion blocked | ✅ | `users.service.ts:67-73` — transaction count check |
| Last-admin deletion blocked | ✅ | Same `assertNotLastAdmin` called from `deleteUser` |
| USER can be created by ADMIN | ✅ | `users.controller.ts:24` — POST with `requireRole("ADMIN")` |
| USER can be deleted by ADMIN | ✅ | `users.controller.ts:45` — DELETE with `requireRole("ADMIN")` |

### Decision 7: User deletion — Hard delete ✅ PASS (with CRITICAL caveat)

| Check | Status | Evidence |
|-------|--------|----------|
| Hard delete (prisma.user.delete) | ✅ | `users.service.ts:104` |
| No soft-delete layer | ✅ | No `deletedAt`, `isActive`, or soft-delete pattern |
| createdById SET NULL on 5 models | ✅ | `schema.prisma:55,102,147,234,256` — `onDelete: SetNull` |
| **technicianId SET NULL on Maintenance** | **❌ FAIL** | `schema.prisma:177,189` — `technicianId String` (NOT nullable), no `onDelete` |

### Decision 8: Catalogs — USER cannot create/edit/delete ✅ PASS

| Endpoint | Guard | Evidence |
|----------|-------|----------|
| `POST /api/action-types` | `requireRole("ADMIN")` | `action-types.controller.ts:23` |
| `PATCH /api/action-types/:id` | `requireRole("ADMIN")` | `action-types.controller.ts:44` |
| `DELETE /api/action-types/:id` | `requireRole("ADMIN")` | `action-types.controller.ts:55` |
| `POST /api/equipment-categories` | `requireRole("ADMIN")` | `equipment-categories.controller.ts:30` |
| `PATCH /api/equipment-categories/:id` | `requireRole("ADMIN")` | `equipment-categories.controller.ts:56` |
| `DELETE /api/equipment-categories/:id` | `requireRole("ADMIN")` | `equipment-categories.controller.ts:70` |

---

## 3. Module Verification (per spec file)

### auth/spec.md ✅ PASS
- All 4 ADDED requirements implemented (role in JWT, refresh re-reads, migration, admin-only creation)
- Both MODIFIED requirements updated (login returns role, refresh re-reads DB)
- All scenarios have corresponding code paths

### clients/spec.md ✅ PASS
- Ownership on create: `clients.controller.ts:34` passes `req.user!.userId`
- Ownership-based edit: `requireOwnershipOrAdmin` at line 70
- Delete restricted: `requireRole("ADMIN")` at line 87
- Frontend gating: ClientCard line 147, ClientDetailPage line 315
- List filter: `clients.controller.ts:23` scopes by `createdById` for USER

### equipment/spec.md ✅ PASS
- Same pattern as clients. All scenarios covered.

### software/spec.md ✅ PASS
- Same pattern. All scenarios covered.

### templates/spec.md ✅ PASS
- Same pattern. All scenarios covered.

### attachments/spec.md ⚠️ PARTIAL
- Delete restricted: ✅ `attachments.controller.ts:95`
- Frontend gating: ✅ PhotoUpload line 204
- **Ownership on create**: ❌ `attachments.controller.ts:31-51,55-75` — POST handlers do NOT pass `req.user!.userId` to `uploadAttachment`. The service function (`attachments.service.ts:105-114`) does NOT set `createdById`. All attachments are created with `createdById: null`.

### maintenances/spec.md ⚠️ PARTIAL
- Ownership on create: ✅ `maintenances.controller.ts:42` — `technicianId` set
- Ownership-based edit: ✅ `requireOwnershipOrAdmin` checking `technicianId`
- Close scoped: ✅ `requireOwnershipOrAdmin` at line 120
- Delete item restricted: ✅ `requireRole("ADMIN")` at line 103
- Frontend gating: ✅ ItemCard line 108, PhotoUpload via `canRemove`
- **Cascade on user deletion**: ❌ `Maintenance.technicianId` is `String` (NOT nullable) with no `onDelete: SetNull`. Deleting a user who is a technician will FAIL with a PostgreSQL FK violation.

### action-types/spec.md ⚠️ PARTIAL
- Backend CRUD restricted: ✅ All write routes have `requireRole("ADMIN")`
- **Frontend catalog UI gating**: ❌ `ActionTypeSelect.vue:84` — `<option value="__create__">+ Nuevo tipo</option>` is NOT gated by `v-if="auth.isAdmin"`. USER sees the option, clicks it, fills the form, and gets a 403 from the backend.

### equipment-categories/spec.md ✅ PASS
- Backend CRUD restricted: ✅ All write routes have `requireRole("ADMIN")`
- Frontend gating: ✅ EquipmentForm lines 311, 323, 647, 657

### notifications/spec.md ✅ PASS
- Role-agnostic access: ✅ No changes needed, already user-scoped

### push/spec.md ⚠️ PARTIAL
- USER deletes own subscription: ✅ `push.controller.ts:93-97` scopes by `userId`
- **ADMIN deletes any subscription**: ❌ `removeSubscription()` at `push.service.ts:89-93` always filters by `userId`. ADMIN cannot bypass the ownership filter.

### users/spec.md ⚠️ PARTIAL
- List users: ✅ `users.controller.ts:14`
- Create user: ✅ `users.controller.ts:24`
- Change role: ✅ `users.controller.ts:34`
- Delete user: ✅ `users.controller.ts:45`
- Self-demotion blocked: ✅ `users.service.ts:82`
- Last-admin protection: ✅ `users.service.ts:55-74`
- **Get user by id**: ❌ `GET /api/users/:id` endpoint does NOT exist. Spec requires it (lines 77-93).
- Admin UI: ✅ AdminUsersPage.vue, UserList.vue, UserCreateForm.vue
- Router guard: ✅ `router/index.ts:74-76`
- Nav item: ✅ `AppNav.vue:28-32`
- **Cascade on user deletion**: ❌ Same as maintenances — `technicianId` not nullable, no `onDelete: SetNull`

---

## 4. Task Verification

| PR | Tasks | Complete | Issues |
|----|-------|----------|--------|
| PR-A | 12 (A.1-A.12) | 12 | 0 |
| PR-B | 12 (B.1-B.12) | 12 | 0 |
| PR-C | 9 (C.1-C.11) | 9 | 0 |
| **Total** | **33** | **33** | **0** |

All 33 tasks are marked ✅ in tasks.md and have corresponding implementation evidence in the codebase.

**Note**: Task verification confirms the tasks were implemented as described, but some tasks didn't capture spec nuances that are now surfaced as findings (e.g., B.5 attachment ownership, push ADMIN delete, users GET/:id).

---

## 5. Architectural Verification

| Decision | Honored | Evidence |
|----------|---------|----------|
| Users module at `apps/api/src/modules/users/` | ✅ | controller, service, schema all present |
| `requireRole` and `requireOwnershipOrAdmin` in middleware | ✅ | `middleware/auth.ts:39,60` |
| `auth.service.ts` includes role in TokenPayload | ✅ | `auth.service.ts:8-12` |
| `auth.service.ts` refresh re-reads role from DB | ✅ | `auth.service.ts:79-93` |
| 16 v-if guards in frontend | ✅ | Counted and verified (see Decision 5 table) |
| AdminUsersPage.vue exists | ✅ | `apps/web/src/views/AdminUsersPage.vue` |
| Router guard on /admin/users | ✅ | `router/index.ts:54-58, 74-76` |
| AppNav admin nav item | ✅ | `AppNav.vue:28-32` |
| Error shape coexistence | ✅ | Nested `{ error: { code, message } }` for RBAC, flat `{ error: string }` for legacy |
| createdById on 5 models with SetNull | ✅ | `schema.prisma:54-55, 101-102, 146-147, 233-234, 255-256` |
| PR slicing A→B→C sequential | ✅ | Commits confirmed in apply-progress.md |

---

## 6. Deviations and Gaps

### PR-C Deviations (flagged by apply agent)

| # | Deviation | Assessment |
|---|-----------|------------|
| 1 | `createdById` type gap (PR-A didn't update `packages/types`) | **Correct fix** — PR-C commit `f2c1d21` added `createdById: string \| null` to Client, Equipment, Software, Template, Attachment interfaces in `packages/types/src/models.ts`. No regression. |
| 2 | PhotoUpload `canRemove` prop | **Correct fix** — Added `canRemove` prop (defaults `true`) to gate the remove button independently from the upload dropzone. Used by MaintenanceFlowPage (`:can-remove="auth.isAdmin"`) and ItemCard (`:can-remove="isAdmin"`). No regression. |
| 3 | ItemCard remove button added | **Correct fix** — Added remove button gated by `isAdmin` prop. Previously missing from template despite having the emit. No regression. |

### New Deviations Found in Verify

| # | Deviation | Severity |
|---|-----------|----------|
| 1 | `Maintenance.technicianId` not nullable, no `onDelete: SetNull` | CRITICAL (F1) |
| 2 | Attachments don't set `createdById` on upload | WARNING (F2) |
| 3 | Push ADMIN delete not implemented | WARNING (F3) |
| 4 | `GET /api/users/:id` endpoint missing | WARNING (F4) |
| 5 | Last-admin error code mismatch (409 vs spec 403, flat vs nested) | WARNING (F5) |
| 6 | ActionTypeSelect "+ Nuevo tipo" not gated for USER | WARNING (F6) |
| 7 | Password validation mismatch (frontend 6 vs backend 8) | WARNING (F7) |

---

## 7. Findings

### CRITICAL (must fix before archive)

#### F1: Maintenance.technicianId NOT nullable — user deletion will fail
- **Description**: `schema.prisma:177` defines `technicianId String @map("technician_id")` (NOT nullable). The relation at line 189 has no `onDelete` clause, defaulting to PostgreSQL `Restrict`. When an admin tries to delete a user who is assigned as a technician on any maintenance, Prisma will throw a foreign key constraint violation. The spec (users/spec.md lines 95-108, design.md section 8.1) explicitly requires `technicianId` to become NULL on user deletion.
- **Location**: `apps/api/prisma/schema.prisma:177,189`
- **Suggested fix**: Change `technicianId String` to `technicianId String?` and add `onDelete: SetNull` to the relation. Update `packages/types/src/models.ts` to `technicianId: string | null`. Requires a new migration.

### WARNING (should fix, doesn't block archive)

#### F2: Attachments don't set `createdById` on upload
- **Description**: `attachments.controller.ts:31-75` — Both POST handlers call `uploadAttachment()` without passing `req.user!.userId`. The service function (`attachments.service.ts:105-114`) creates the record without `createdById`. All attachments have `createdById: null`. Spec (attachments/spec.md lines 5-11) requires `createdById` to be set.
- **Location**: `apps/api/src/modules/attachments/attachments.controller.ts:41-45,65-69` and `attachments.service.ts:33-37,105-114`
- **Suggested fix**: Add `createdById?: string` to `UploadAttachmentInput`, pass `req.user!.userId` from both POST handlers, and include it in the `prisma.attachment.create` data.

#### F3: Push ADMIN delete not implemented
- **Description**: `push.controller.ts:89-107` — DELETE endpoint always scopes by `req.user!.userId`. The spec (push/spec.md lines 5-11) requires ADMIN to delete any user's subscription. Currently, ADMIN can only delete their own.
- **Location**: `apps/api/src/services/notifications/push.controller.ts:93-97` and `push.service.ts:89-93`
- **Suggested fix**: In the DELETE handler, check if `req.user.role === "ADMIN"`. If ADMIN, call `removeSubscription(null, endpoint)` or a separate admin function that doesn't filter by userId. If USER, keep current behavior.

#### F4: `GET /api/users/:id` endpoint missing
- **Description**: users/spec.md lines 77-93 define three scenarios for `GET /api/users/:id` (ADMIN gets any, user gets self, USER cannot get another). The endpoint does not exist in `users.controller.ts`.
- **Location**: `apps/api/src/modules/users/users.controller.ts` — missing route
- **Suggested fix**: Add `GET /:id` handler. ADMIN can get any user. USER can only get themselves (`req.params.id === req.user.userId`), else 403.

#### F5: Last-admin error code mismatch (backend ↔ frontend)
- **Description**: Backend throws `createError(409, "Cannot remove the last admin")` which produces `{ error: "Cannot remove the last admin" }` (flat shape, no `code` field). Frontend `AdminUsersPage.vue:34` checks `err.response?.data?.error?.code === "LAST_ADMIN"` — this NEVER matches because the error shape is flat and has no code. Users see generic error messages instead of the friendly Spanish text. Additionally, the spec (users/spec.md lines 51,57,70) says 403, but implementation uses 409.
- **Location**: `users.service.ts:71,83,99` and `AdminUsersPage.vue:34,49`
- **Suggested fix**: Either (a) change backend to use nested shape `{ error: { code: "LAST_ADMIN", message: "..." } }` with status 403 per spec, or (b) update frontend to check the flat error message. Option (a) is preferred for consistency with the RBAC middleware error shape.

#### F6: ActionTypeSelect "+ Nuevo tipo" not gated for USER
- **Description**: `ActionTypeSelect.vue:84` renders `<option value="__create__">+ Nuevo tipo</option>` unconditionally. No `v-if="auth.isAdmin"` guard exists. The component doesn't even import the auth store. USER sees the option, selects it, fills the inline form, submits, and gets a 403 from the backend. Spec (action-types/spec.md lines 36-39) requires hiding this for USER.
- **Location**: `apps/web/src/components/maintenance/ActionTypeSelect.vue:84`
- **Suggested fix**: Import `useAuthStore`, add `v-if="auth.isAdmin"` to the `__create__` option, and gate the inline create form.

#### F7: Password validation mismatch (frontend 6 vs backend 8)
- **Description**: `UserCreateForm.vue:36` validates `password.length < 6` (minimum 6). `users.schema.ts:5` validates `z.string().min(8)` (minimum 8). A password of 6-7 chars passes frontend validation but fails backend Zod with a 400 error.
- **Location**: `apps/web/src/components/admin/UserCreateForm.vue:36` and `apps/api/src/modules/users/users.schema.ts:5`
- **Suggested fix**: Align both to `min(8)` (backend is the source of truth per design).

### SUGGESTION (nice to have)

#### S1: UserList "vos" label — regional dialect
- **Description**: `UserList.vue:55` uses `(vos)` for self-identification. Project convention is neutral/professional Spanish for UI strings. Should be `(tú)` or `(vosotros)` or simply `(yo)`.
- **Location**: `apps/web/src/components/admin/UserList.vue:55`
- **Suggested fix**: Change to `(tú)` or `(yo)`.

#### S2: UserList role dropdown not disabled for self
- **Description**: `UserList.vue:62-70` — The role change dropdown is available for the current user's own row. While the backend blocks self-demotion, the UX would be clearer if the dropdown were disabled for the current user.
- **Location**: `apps/web/src/components/admin/UserList.vue:62-70`
- **Suggested fix**: Add `:disabled="isSelf(user.id)"` to the select element.

#### S3: UserCreateForm password placeholder mismatch
- **Description**: `UserCreateForm.vue:124` placeholder says "Mínimo 6 caracteres" but backend requires 8.
- **Location**: `apps/web/src/components/admin/UserCreateForm.vue:124`
- **Suggested fix**: Change to "Mínimo 8 caracteres".

---

## 8. Completeness Summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| Build | ✅ PASS | Both api and web build clean |
| Tasks (33/33) | ✅ PASS | All tasks implemented |
| 8 Product Decisions | ⚠️ 7/8 PASS | Decision 7 (user deletion cascade) has CRITICAL gap |
| 12 Spec Modules | ⚠️ 7/12 PASS, 5/12 PARTIAL | 5 modules have partial gaps |
| Architecture | ✅ PASS | All design decisions honored |
| PR-C Deviations | ✅ 3/3 correct | All fixes are valid, no regressions |

---

## 9. Status

**Overall: FAIL**

**Recommendation: fix critical first**

**Next recommended: fix and re-verify**

### Rationale

One CRITICAL finding (F1) will cause a **runtime crash** when deleting a user who is assigned as a technician. This is a data integrity issue — the spec explicitly requires `technicianId` to become NULL on user deletion, but the schema will reject the delete entirely. This MUST be fixed before archive.

The 7 WARNING findings are real gaps but don't cause crashes. They should be fixed in a follow-up slice or as hotfixes. The most impactful warnings are:
- F5 (error code mismatch) — users see confusing error messages
- F6 (ActionTypeSelect not gated) — USER gets 403 on inline create
- F7 (password validation) — inconsistent UX
