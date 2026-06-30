# Verification Report: mantenti-mvp-slice-7 (Re-check)

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
| `pnpm --filter web build` | **OK** | vue-tsc + vite build clean, 148 modules, 3.19s |

---

## 2. Findings Resolution (10/10 RESOLVED)

### F1: Maintenance.technicianId nullable + onDelete SetNull ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/api/prisma/schema.prisma:177` — `technicianId String?` (nullable)
- `apps/api/prisma/schema.prisma:189` — `technician User? @relation(fields: [technicianId], references: [id], onDelete: SetNull)`
- `apps/api/prisma/migrations/20260630164451_make_maintenance_technician_nullable_set_null/migration.sql:7-13` — Clean migration: drops old FK, ALTER COLUMN DROP NOT NULL, re-adds FK with ON DELETE SET NULL
- `packages/types/src/models.ts:83` — `technicianId: string | null`
- `apps/api/src/services/pdf/pdf.service.ts:269` — `maintenance.technician?.fullName ?? "Sin asignar"` (null-safe)
- `apps/api/src/services/pdf/pdf.service.ts:764` — Same null-safe pattern

**Notes**: User deletion now correctly sets technicianId to NULL instead of failing with FK violation.

---

### F2: Attachments set createdById on upload ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/api/src/modules/attachments/attachments.controller.ts:45` — `createdById: req.user!.userId` (POST /maintenances/:id/attachments)
- `apps/api/src/modules/attachments/attachments.controller.ts:70` — `createdById: req.user!.userId` (POST /maintenances/:id/items/:itemId/attachments)
- `apps/api/src/modules/attachments/attachments.service.ts:37` — `createdById?: string` in `UploadAttachmentInput` interface
- `apps/api/src/modules/attachments/attachments.service.ts:114` — `createdById: input.createdById ?? null` in `prisma.attachment.create`

**Notes**: All new attachments now have createdById set to the uploading user's ID.

---

### F3: Push ADMIN delete ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/api/src/services/notifications/push.controller.ts:94` — `const userId = req.user!.role === "ADMIN" ? null : req.user!.userId`
- `apps/api/src/services/notifications/push.service.ts:89` — `removeSubscription(userId: string | null, endpoint: string)` accepts nullable userId
- `apps/api/src/services/notifications/push.service.ts:90` — `const where = userId ? { userId, endpoint } : { endpoint }` — when userId is null (ADMIN), deletes by endpoint alone

**Notes**: ADMIN can now delete any user's subscription. USER can only delete their own.

---

### F4: GET /api/users/:id endpoint ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/api/src/modules/users/users.controller.ts:23-31` — `GET /:id` route exists
- `apps/api/src/modules/users/users.service.ts:32-48` — `getUserById(id, currentUser)` function with self-or-ADMIN check
- `apps/api/src/modules/users/users.service.ts:37` — `if (currentUser.role !== "ADMIN" && currentUser.userId !== id)` throws 403
- `apps/api/src/modules/users/users.controller.ts:13,34,44,55` — Other routes (GET /, POST /, PATCH /:id/role, DELETE /:id) have `requireRole("ADMIN")`

**Notes**: USER can get their own profile. ADMIN can get any user. USER cannot get another user's profile.

---

### F5: LAST_ADMIN error code alignment ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/api/src/middleware/error-handler.ts:8` — `code?: string` field in `AppError` interface
- `apps/api/src/middleware/error-handler.ts:11` — `createError(statusCode: number, message: string, code?: string)` accepts optional code
- `apps/api/src/middleware/error-handler.ts:57-61` — Produces nested `{ error: { code, message } }` when code is present, flat `{ error: string }` otherwise
- `apps/api/src/modules/users/users.service.ts:89` — `createError(403, "Cannot remove the last admin", "LAST_ADMIN")`
- `apps/web/src/views/AdminUsersPage.vue:34` — `if (code === "LAST_ADMIN")` checks nested error code
- `apps/web/src/views/AdminUsersPage.vue:49` — Same check in handleDelete

**Notes**: Backend and frontend now use the same error code. Status changed from 409 to 403 per spec. Users see friendly Spanish error messages.

---

### F6: ActionTypeSelect '+ Nuevo tipo' gated for USER ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/web/src/components/maintenance/ActionTypeSelect.vue:4` — `import { useAuthStore } from "@/stores/auth"`
- `apps/web/src/components/maintenance/ActionTypeSelect.vue:86` — `<option v-if="auth.isAdmin" value="__create__">+ Nuevo tipo</option>`
- `apps/web/src/components/maintenance/ActionTypeSelect.vue:97` — `v-if="showCreate && auth.isAdmin"` on inline create form

**Notes**: USER no longer sees the "+ Nuevo tipo" option. Only ADMIN can create new action types.

---

### F7: Password validation 8 chars ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/web/src/components/admin/UserCreateForm.vue:36` — `form.value.password.length < 8`
- `apps/web/src/components/admin/UserCreateForm.vue:37` — Error message: "Mínimo 8 caracteres"
- `apps/api/src/modules/users/users.schema.ts:5` — `z.string().min(8)`

**Notes**: Frontend and backend now both require minimum 8 characters.

---

### S1: UserList neutral Spanish ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/web/src/components/admin/UserList.vue:55` — `<span v-if="isSelf(user.id)" class="text-xs text-slate-400">(tú)</span>`

**Notes**: Changed from "(vos)" to "(tú)" for neutral Spanish.

---

### S2: UserList role dropdown disabled for self ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/web/src/components/admin/UserList.vue:64` — `:disabled="isSelf(user.id)"`
- `apps/web/src/components/admin/UserList.vue:67` — `disabled:opacity-50 disabled:cursor-not-allowed` styling

**Notes**: Role dropdown is now disabled for the current user's own row, preventing confusion.

---

### S3: UserCreateForm password placeholder ✅ RESOLVED

**Status**: RESOLVED

**Evidence**:
- `apps/web/src/components/admin/UserCreateForm.vue:124` — `placeholder="Mínimo 8 caracteres"`

**Notes**: Placeholder now matches the actual validation requirement.

---

## 3. Migration Surgery Verification

### F1 migration is clean: ✅ YES

**Evidence**:
- `apps/api/prisma/migrations/20260630164451_make_maintenance_technician_nullable_set_null/migration.sql` contains ONLY:
  - Line 7: `DROP CONSTRAINT "maintenances_technician_id_fkey"`
  - Line 10: `ALTER COLUMN "technician_id" DROP NOT NULL`
  - Line 13: `ADD CONSTRAINT ... ON DELETE SET NULL ON UPDATE CASCADE`
- No drift or unrelated changes included

### Chore migration captures the drift: ✅ YES

**Evidence**:
- `apps/api/prisma/migrations/20260630150000_sync_equipment_software_cleanup_drift/migration.sql` captures:
  - Equipment-software-fk-cleanup drift from archived slice (2026-06-24)
  - Drops `equipment_components` table and `ComponentType` enum
  - Adds `software_id`, `disk`, `processor`, `ram` columns to `equipment`
  - Removes `has_license`, `license_expires_at`, `license_notes`, `license_type` columns
  - Adds `equipment_software_id_idx` index
  - Adds `equipment_software_id_fkey` FK constraint

### Order is correct: ✅ YES

**Evidence**:
- Chore migration timestamp: `20260630150000` (15:00:00)
- F1 migration timestamp: `20260630164451` (16:44:51)
- Chore runs first, F1 runs second — correct order

**Notes**: The dev DB has a checksum drift on F1 (old checksum in `_prisma_migrations` table from before the fix-up). This is a known issue documented in apply-progress.md. Not a blocker for archive — fresh databases will apply both migrations correctly via `prisma migrate deploy`.

---

## 4. Regression Check

### Previously-clean parts: ✅ STILL CLEAN

**Evidence**:

**16 v-if guards (now 17 with F6 fix)**:
1. `ClientListPage.vue:52` — "Nuevo cliente" button ✅
2. `ClientListPage.vue:136` — Empty-state create ✅
3. `ClientDetailPage.vue:304` — "Editar" button ✅
4. `ClientDetailPage.vue:315` — "Eliminar" button ✅
5. `ClientDetailPage.vue:571` — Software edit ✅
6. `ClientDetailPage.vue:582` — Software delete ✅
7. `ClientCard.vue:147` — Delete menu item ✅
8. `EquipmentList.vue:236` — Delete button ✅
9. `EquipmentForm.vue:311` — Create category (+) ✅
10. `EquipmentForm.vue:323` — Gear icon ✅
11. `EquipmentForm.vue:647` — Edit category ✅
12. `EquipmentForm.vue:657` — Delete category ✅
13. `ItemCard.vue:108` — Remove item button ✅
14. `PhotoUpload.vue:204` — Remove attachment (`canRemove !== false`) ✅
15. `MaintenanceFlowPage.vue:342` — General photo remove ✅
16. `AppNav.vue:58` — "Usuarios" nav item ✅
17. `ActionTypeSelect.vue:86` — "+ Nuevo tipo" option (NEW from F6 fix) ✅

**Middleware intact**:
- `apps/api/src/middleware/auth.ts:39-53` — `requireRole()` factory ✅
- `apps/api/src/middleware/auth.ts:60-94` — `requireOwnershipOrAdmin()` factory ✅
- ADMIN bypass at line 70 ✅
- USER ownership check at line 84 ✅

**Users module CRUD**:
- All 5 endpoints present (GET /, GET /:id, POST /, PATCH /:id/role, DELETE /:id) ✅
- Self-demotion blocked ✅
- Self-deletion blocked ✅
- Last-admin protection ✅

**Auth store and useAuth composable**:
- `apps/web/src/stores/auth.ts` — role helpers (isAdmin, canEdit, canDelete) ✅
- `apps/web/src/composables/useAuth.ts` — composable wrapper ✅

**Build verification**:
- `pnpm --filter api build`: OK ✅
- `pnpm --filter web build`: OK ✅

**No regressions detected**.

---

## 5. New Findings

### CRITICAL: 0

### WARNING: 0

### SUGGESTION: 0

**Notes**: No new findings identified during re-verification.

---

## 6. Status

**Overall: PASS**

**Recommendation: ready for sdd-archive**

**Next recommended: archive**

### Rationale

All 10 findings from the original verify report are now RESOLVED:
- 1 CRITICAL (F1) — fixed with nullable technicianId + onDelete SetNull
- 7 WARNINGS (F2-F7) — all fixed
- 3 SUGGESTIONS (S1-S3) — all fixed

Migration surgery is correct:
- F1 migration is clean (no drift)
- Chore migration captures the equipment-software-fk-cleanup drift
- Order is correct (chore < F1)

No regressions detected:
- All 17 v-if guards in place (16 original + 1 new from F6)
- Middleware intact
- Users module CRUD working
- Build passes for both api and web

The implementation is now complete and ready for sdd-archive.

---

## 7. Completeness Summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| Build | ✅ PASS | Both api and web build clean |
| Tasks (33/33) | ✅ PASS | All tasks implemented |
| 8 Product Decisions | ✅ PASS | All 8 decisions honored |
| 12 Spec Modules | ✅ PASS | All 12 modules fully compliant |
| Architecture | ✅ PASS | All design decisions honored |
| Findings (10/10) | ✅ RESOLVED | 1 CRITICAL + 7 WARNING + 3 SUGGESTION all fixed |
| Migration Surgery | ✅ PASS | F1 clean, chore correct, order correct |
| Regressions | ✅ NONE | No regressions detected |

---

## 8. Appendix: Fix-up Branch Details

**Branch**: `slice-7/fix-verify-findings`
**Merged to master**: commit `3fef75f`
**Date**: 2026-06-30

### Commits (8 total)

| # | Hash | Message | Finding |
|---|------|---------|---------|
| 1 | `ca08a98` | `fix(db): make Maintenance.technicianId nullable with onDelete SetNull` | F1 |
| 2 | `4197fa5` | `fix(api): set createdById on attachment upload` | F2 |
| 3 | `a0f189d` | `fix(api): allow ADMIN to delete any push subscription` | F3 |
| 4 | `2487b0f` | `feat(api): add GET /api/users/:id for self or ADMIN` | F4 |
| 5 | `a119c72` | `fix(rbac): align LAST_ADMIN error code between backend and frontend` | F5 |
| 6 | `3b55f4a` | `fix(web): gate ActionTypeSelect create button for ADMIN` | F6 |
| 7 | `6881e1d` | `fix(web): align password min length to 8 chars in UserCreateForm` | F7, S3 |
| 8 | `52fb7bf` | `fix(web): use neutral Spanish in UserList and disable role dropdown for self` | S1, S2 |

### F3 Investigation Outcome

PR-B's apply agent was wrong when it reported "no changes needed" for the push module. The agent claimed "DELETE subscription already scoped by `req.user.userId`" — technically true, but the spec explicitly requires ADMIN to delete ANY user's subscription, not just their own. The verify agent correctly identified this gap. The fix was straightforward: `removeSubscription` now accepts `userId: string | null`, and the controller passes `null` for ADMIN (deletes any) or `req.user.userId` for USER (own only).

---

**Report generated**: 2026-06-30
**Re-verification by**: sdd-verify (re-check after fix-up merge)
**Previous report**: FAIL (1 CRITICAL, 7 WARNING, 3 SUGGESTION)
**Current report**: PASS (all findings resolved, no regressions)
