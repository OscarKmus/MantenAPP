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
