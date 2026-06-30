# Design: Multi-User RBAC (Slice 7)

## 1. Architecture Overview

### Request Lifecycle — Protected Endpoints

```
[Client Request]
    ↓
[authMiddleware] ──→ Verify JWT, set req.user = { userId, username, role }
    ↓
[requireRole('ADMIN')] ──→ Check req.user.role === 'ADMIN', else 403
    ↓
[Controller Handler]
```

### Request Lifecycle — Ownership-Protected Endpoints

```
[Client Request]
    ↓
[authMiddleware] ──→ Verify JWT, set req.user = { userId, username, role }
    ↓
[requireOwnershipOrAdmin(getOwnerId)]
    ├─→ If req.user.role === 'ADMIN': pass
    └─→ Else: fetch resource, check resource.createdById === req.user.userId, else 403
    ↓
[Controller Handler]
```

### Data Flow — User Creation

```
[Admin POST /api/users]
    ↓
[authMiddleware + requireRole('ADMIN')]
    ↓
[users.controller] ──→ validate with Zod schema
    ↓
[users.service.createUser] ──→ hash password, insert into DB
    ↓
[Return user object (no passwordHash)]
```

### Data Flow — Role Change

```
[Admin PATCH /api/users/:id/role]
    ↓
[authMiddleware + requireRole('ADMIN')]
    ↓
[users.controller] ──→ validate { role }
    ↓
[users.service.updateUserRole]
    ├─→ Check target user exists
    ├─→ If demoting: assertNotLastAdmin(userId, newRole)
    ├─→ If self-demotion: block (403)
    └─→ Update user.role in DB
    ↓
[Return updated user]
```

## 2. Database Schema

### 2.1 Prisma Enum

```prisma
enum UserRole {
  USER
  ADMIN
}
```

### 2.2 User Model Updates

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  fullName     String   @map("full_name")
  role         UserRole @default(USER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  maintenances           Maintenance[]
  notifications          Notification[]
  notificationPreferences NotificationPreference[]
  
  // Reverse relations for createdById
  createdClients     Client[]
  createdEquipment   Equipment[]
  createdSoftware    Software[]
  createdTemplates   Template[]
  createdAttachments Attachment[]

  @@map("users")
}
```

### 2.3 createdById on Resources

For each of these 5 models, add:

```prisma
createdById   String? @map("created_by_id")
createdBy     User?   @relation(fields: [createdById], references: [id], onDelete: SetNull)
```

**Models:**
- `Client` (line 27)
- `Equipment` (line 67)
- `Software` (line 114)
- `Template` (line 218)
- `Attachment` (line 198)

**Index recommendation:** Add `@@index([createdById])` to each model for ownership queries.

### 2.4 Migration Strategy

**File name:** `YYYYMMDDHHMMSS_add_user_role_and_created_by/migration.sql`

**SQL (Prisma generates most of this, plus custom block):**

```sql
-- Prisma-generated:
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Custom raw SQL (in Prisma migrate block):
UPDATE "users" SET "role" = 'ADMIN' WHERE "username" = 'admin';

-- Backfill createdById for existing records (set to admin's id)
DO $$ 
DECLARE admin_id TEXT;
BEGIN
  SELECT "id" INTO admin_id FROM "users" WHERE "username" = 'admin' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    UPDATE "clients" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "equipment" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "software" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "templates" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
    UPDATE "attachments" SET "created_by_id" = admin_id WHERE "created_by_id" IS NULL;
  END IF;
END $$;

-- Prisma-generated (after custom block):
ALTER TABLE "clients" ADD COLUMN "created_by_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "equipment" ADD COLUMN "created_by_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "software" ADD COLUMN "created_by_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "templates" ADD COLUMN "created_by_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "attachments" ADD COLUMN "created_by_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
```

**Backfill logic:** Existing records get `created_by_id = admin's id` (not NULL). This preserves ownership context for legacy data.

**Rollback:** Drop columns, drop enum type.

## 3. JWT and Auth Changes

### 3.1 TokenPayload

```ts
interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole; // NEW
}
```

### 3.2 Login Response Shape

```ts
{
  user: {
    id: string,
    username: string,
    fullName: string,
    role: UserRole, // NEW
    createdAt: string,
    updatedAt: string
  },
  accessToken: string,
  refreshToken: string
}
```

### 3.3 getMe Response

Same shape as login (single source of truth via `sanitizeUser`).

### 3.4 Refresh — Re-read Role from DB

```ts
export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  
  // Re-read user from DB to get fresh role
  const user = await prisma.user.findUnique({ 
    where: { id: payload.userId } 
  });
  
  if (!user) {
    throw createError(401, "User not found");
  }
  
  const newAccessToken = generateAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role, // Fresh role from DB
  });
  
  return { accessToken: newAccessToken };
}
```

**Rationale:** Bounds the demotion window to 15 min (access token TTL). When a user is demoted, their next refresh (within 15 min) gets a new access token with `role: USER`.

### 3.5 15-Min Demotion Window

**Documented limitation:** After an admin demotes a user, the old access token (with `role: ADMIN`) remains valid for up to 15 minutes.

**Mitigations:**
1. Refresh re-reads role from DB (already implemented above)
2. Short access token TTL (15 min, already configured)
3. Future: admin demote endpoint could optionally invalidate refresh tokens (out of scope for MVP)

**Acceptable for MVP:** Internal tool, small team, 15-min window is low risk.

## 4. Middleware Design

### 4.1 Express Request Augmentation

Update `apps/api/src/middleware/auth.ts`:

```ts
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/auth/auth.service";
import type { UserRole } from "@mantenti/types";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole; // NEW
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}
```

### 4.2 requireRole

```ts
import type { RequestHandler } from "express";
import type { UserRole } from "@mantenti/types";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
      return;
    }
    
    next();
  };
}
```

### 4.3 requireOwnershipOrAdmin

```ts
import type { RequestHandler } from "express";

export function requireOwnershipOrAdmin(
  getOwnerId: (req: Request) => Promise<string | null>
): RequestHandler {
  return async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    
    // ADMIN passes
    if (req.user.role === "ADMIN") {
      next();
      return;
    }
    
    // USER: check ownership
    try {
      const ownerId = await getOwnerId(req);
      
      if (!ownerId) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found" } });
        return;
      }
      
      if (ownerId !== req.user.userId) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "You can only edit your own records" } });
        return;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

**Concrete example for `PUT /clients/:id`:**

```ts
clientsRouter.patch(
  "/:id",
  validate(updateClientSchema),
  requireOwnershipOrAdmin(async (req) => {
    const client = await prisma.client.findUnique({ 
      where: { id: req.params.id } 
    });
    return client?.createdById ?? null;
  }),
  async (req, res, next) => {
    // ... handler
  }
);
```

### 4.4 Error Response Shape

Consistent JSON structure:

```ts
{
  error: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "LAST_ADMIN" | "VALIDATION_ERROR",
    message: string,
    details?: any // Optional, for validation errors
  }
}
```

**Error codes:**
- `UNAUTHORIZED` (401): No token or invalid token
- `FORBIDDEN` (403): Authenticated but insufficient permissions
- `NOT_FOUND` (404): Resource doesn't exist
- `LAST_ADMIN` (409): Cannot demote/delete the last admin
- `VALIDATION_ERROR` (400): Zod validation failed

## 5. Per-Module Integration Pattern

### 5.1 clients.controller.ts (Representative Example)

```ts
// DELETE /api/clients/:id — ADMIN only
clientsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  async (req, res, next) => {
    // ... handler
  }
);

// PATCH /api/clients/:id — ownership check
clientsRouter.patch(
  "/:id",
  validate(updateClientSchema),
  requireOwnershipOrAdmin(async (req) => {
    const client = await prisma.client.findUnique({ 
      where: { id: req.params.id } 
    });
    return client?.createdById ?? null;
  }),
  async (req, res, next) => {
    // ... handler
  }
);

// GET /api/clients — filter by createdById for USER
clientsRouter.get("/", validate(clientQuerySchema), async (req, res, next) => {
  try {
    const { q } = req.query as { q?: string };
    
    // Filter by ownership for USER, return all for ADMIN
    const where = req.user?.role === "USER" 
      ? { createdById: req.user.userId }
      : {};
    
    const clients = await listClients(q, where);
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});
```

### 5.2 Other Controllers (Compact Pattern)

| Controller | DELETE Guard | PUT/PATCH Guard | GET Filter |
|------------|--------------|-----------------|------------|
| `equipment.controller.ts` | `requireRole("ADMIN")` | `requireOwnershipOrAdmin(getEquipmentOwnerId)` | `createdById` for USER |
| `software.controller.ts` | `requireRole("ADMIN")` | `requireOwnershipOrAdmin(getSoftwareOwnerId)` | `createdById` for USER |
| `templates.controller.ts` | `requireRole("ADMIN")` | `requireOwnershipOrAdmin(getTemplateOwnerId)` | `createdById` for USER |
| `attachments.controller.ts` | `requireRole("ADMIN")` | `requireOwnershipOrAdmin(getAttachmentOwnerId)` | `createdById` for USER |
| `maintenances.controller.ts` | `requireRole("ADMIN")` on DELETE item | Use `technicianId` as owner | `technicianId` for USER |
| `action-types.controller.ts` | `requireRole("ADMIN")` | `requireRole("ADMIN")` on POST/PUT/PATCH | No filter (catalog) |
| `equipment-categories.controller.ts` | `requireRole("ADMIN")` | `requireRole("ADMIN")` on POST/PUT/PATCH | No filter (catalog) |

**Owner ID helpers:**

```ts
// equipment.controller.ts
async function getEquipmentOwnerId(req: Request): Promise<string | null> {
  const equipment = await prisma.equipment.findUnique({ 
    where: { id: req.params.id } 
  });
  return equipment?.createdById ?? null;
}

// maintenances.controller.ts — use technicianId
async function getMaintenanceOwnerId(req: Request): Promise<string | null> {
  const maintenance = await prisma.maintenance.findUnique({ 
    where: { id: req.params.id } 
  });
  return maintenance?.technicianId ?? null;
}
```

## 6. New Users Module

### 6.1 Routes

```ts
// apps/api/src/modules/users/users.controller.ts

import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/require-role";
import { createUserSchema, updateUserRoleSchema } from "./users.schema";
import { listUsers, createUser, updateUserRole, deleteUser } from "./users.service";

export const usersRouter = Router();

// All routes require auth + ADMIN
usersRouter.use(authMiddleware);
usersRouter.use(requireRole("ADMIN"));

// GET /api/users
usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users
usersRouter.post("/", validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id/role
usersRouter.patch("/:id/role", validate(updateUserRoleSchema), async (req, res, next) => {
  try {
    const user = await updateUserRole(req.params.id, req.body.role, req.user!.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id
usersRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteUser(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

### 6.2 Last-Admin Protection

```ts
// apps/api/src/modules/users/users.service.ts

async function assertNotLastAdmin(userId: string, newRole?: UserRole): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!target) {
    throw createError(404, "User not found");
  }
  
  // Only matters if removing admin status
  if (target.role !== "ADMIN") return;
  if (newRole === "ADMIN") return;
  
  // Use transaction to prevent race conditions
  await prisma.$transaction(async (tx) => {
    const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
    
    if (adminCount <= 1) {
      throw createError(409, "Cannot remove the last admin");
    }
  });
}

export async function updateUserRole(
  userId: string, 
  newRole: UserRole, 
  requesterId: string
) {
  // Prevent self-demotion
  if (userId === requesterId && newRole !== "ADMIN") {
    throw createError(403, "Cannot demote yourself");
  }
  
  await assertNotLastAdmin(userId, newRole);
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
  
  return sanitizeUser(user);
}

export async function deleteUser(userId: string, requesterId: string) {
  await assertNotLastAdmin(userId);
  
  await prisma.user.delete({ where: { id: userId } });
}
```

### 6.3 Zod Schemas

```ts
// apps/api/src/modules/users/users.schema.ts

import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  role: z.enum(["USER", "ADMIN"]).optional().default("USER"),
}).strict();

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
```

### 6.4 Service Skeleton

```ts
// apps/api/src/modules/users/users.service.ts

import argon2 from "argon2";
import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { UserRole } from "@mantenti/types";
import type { CreateUserInput } from "./users.schema";

function sanitizeUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return users.map(sanitizeUser);
}

export async function createUser(input: CreateUserInput) {
  // Check if username exists
  const existing = await prisma.user.findUnique({ 
    where: { username: input.username } 
  });
  
  if (existing) {
    throw createError(409, "Username already exists");
  }
  
  const passwordHash = await argon2.hash(input.password);
  
  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    },
  });
  
  return sanitizeUser(user);
}

export async function updateUserRole(
  userId: string, 
  newRole: UserRole, 
  requesterId: string
) {
  // ... (see 6.2)
}

export async function deleteUser(userId: string, requesterId: string) {
  // ... (see 6.2)
}
```

## 7. Frontend Architecture

### 7.1 Auth Store

Update `apps/web/src/stores/auth.ts`:

```ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/api";
import type { User } from "@mantenti/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const checked = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAdmin = computed(() => user.value?.role === "ADMIN");
  
  function canEdit(resource: { createdById?: string | null }): boolean {
    if (isAdmin.value) return true;
    if (!user.value || !resource.createdById) return false;
    return resource.createdById === user.value.id;
  }
  
  function canDelete(_resource?: any): boolean {
    return isAdmin.value;
  }

  async function login(username: string, password: string) {
    // ... existing
  }

  async function logout() {
    // ... existing
  }

  async function checkAuth() {
    // ... existing
  }

  return { 
    user, 
    checked, 
    loading, 
    error, 
    isAdmin, 
    canEdit, 
    canDelete,
    login, 
    logout, 
    checkAuth 
  };
});
```

### 7.2 useAuth Composable

```ts
// apps/web/src/composables/useAuth.ts

import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";

export function useAuth() {
  const store = useAuthStore();
  const { user, isAdmin } = storeToRefs(store);
  
  return {
    user,
    isAdmin,
    role: computed(() => user.value?.role),
    login: store.login,
    logout: store.logout,
    canEdit: store.canEdit,
    canDelete: store.canDelete,
  };
}
```

### 7.3 Router Guards

**Recommendation:** Keep it simple — gate in components via `v-if="auth.isAdmin"`. Route-level guards add complexity for minimal benefit in an internal tool.

**Optional route meta (if needed later):**

```ts
// apps/web/src/router/index.ts
{
  path: "/admin/users",
  name: "admin-users",
  component: () => import("@/views/AdminUsersPage.vue"),
  meta: { requiresAuth: true, requiresAdmin: true },
}

// In beforeEach:
if (to.meta.requiresAdmin && auth.user?.role !== "ADMIN") {
  return { name: "clients" };
}
```

### 7.4 v-if Patterns

**Delete button:**

```vue
<button 
  v-if="auth.canDelete(client)" 
  @click="onDelete"
>
  Eliminar
</button>
```

**Edit button:**

```vue
<button 
  v-if="auth.canEdit(client)" 
  @click="onEdit"
>
  Editar
</button>
```

**Admin nav:**

```vue
<router-link 
  v-if="auth.isAdmin" 
  to="/admin/users"
>
  Usuarios
</router-link>
```

### 7.5 Admin User Management View

**File structure:**

```
apps/web/src/
├── views/
│   └── AdminUsersPage.vue          ← Main view
├── components/
│   └── users/
│       ├── UserList.vue            ← Table of users
│       ├── UserCreateForm.vue      ← Create user form
│       ├── UserRoleSelect.vue      ← Role dropdown
│       └── ConfirmDeleteModal.vue  ← Delete confirmation (or reuse existing)
└── stores/
    └── users.ts                    ← Pinia store for user CRUD
```

**AdminUsersPage.vue structure:**

```vue
<template>
  <div class="admin-users-page">
    <h1>Gestión de Usuarios</h1>
    
    <UserCreateForm @created="refreshUsers" />
    
    <UserList 
      :users="users" 
      @role-changed="refreshUsers"
      @deleted="refreshUsers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useUsersStore } from "@/stores/users";
import UserCreateForm from "@/components/users/UserCreateForm.vue";
import UserList from "@/components/users/UserList.vue";

const usersStore = useUsersStore();
const users = ref([]);

async function refreshUsers() {
  users.value = await usersStore.fetchUsers();
}

onMounted(refreshUsers);
</script>
```

## 8. Cascade and Ownership Policy

### 8.1 User Deletion — SET NULL on createdById

When a user is deleted:

| Model | Field | Behavior |
|-------|-------|----------|
| Client | `createdById` | SET NULL (record preserved) |
| Equipment | `createdById` | SET NULL (record preserved) |
| Software | `createdById` | SET NULL (record preserved) |
| Template | `createdById` | SET NULL (record preserved) |
| Attachment | `createdById` | SET NULL (record preserved) |
| Maintenance | `technicianId` | Not affected (uses existing FK, no cascade) |

**Rationale:** Preserves historical data. Records become "orphaned" (no owner), but remain accessible to admins.

**Future enhancement:** A `PATCH /clients/:id/owner` endpoint could reassign ownership — out of scope for slice 7.

### 8.2 Maintenance Ownership

Maintenances use `technicianId` (not `createdById`). This field already exists and is the owner for maintenance operations.

**Ownership check:** `technicianId === req.user.userId` OR `req.user.role === "ADMIN"`.

**Edge case:** If a maintenance is assigned to a technician but created by someone else, the technician (not the creator) owns it. This matches the spec: "USER can close their own maintenances" = maintenances where they are the technician.

## 9. PR Slicing — Implementation Order

### PR-A: Schema + Auth + Middleware + Users Module (~700 lines, LOW risk)

**Tasks (in order):**

1. Prisma migration: enum `UserRole`, `User.role` field, `createdById` on 5 models
2. Update `apps/api/src/middleware/auth.ts` — augment `Request` with `role`, update `TokenPayload`
3. Update `apps/api/src/modules/auth/auth.service.ts` — include `role` in JWT, `sanitizeUser`, refresh re-reads role
4. Create `apps/api/src/middleware/require-role.ts` — `requireRole()` factory
5. Create `apps/api/src/middleware/require-ownership.ts` — `requireOwnershipOrAdmin()` factory
6. Create `apps/api/src/modules/users/` — controller, service, schema, routes
7. Update `apps/api/src/index.ts` — mount `/api/users` router
8. Update `apps/api/prisma/seed.ts` — admin → `role: "ADMIN"`
9. Update `apps/api/e2e-pdf-test.ts` — fix `/auth/register` reference (remove it)
10. Update `README.md` — document role model
11. Update `packages/types/src/models.ts` — add `role` to `User` interface, add `UserRole` type

**Verification:**
- `pnpm --filter api build` passes
- `pnpm --filter web build` passes
- Manual: login as admin, verify role in JWT, create a user via POST `/api/users`

### PR-B: Protect DELETE Endpoints + Ownership Checks (~350 lines, HIGH risk)

**Tasks:** Per-module guards on 9 controllers.

For each controller:
1. Add `requireRole("ADMIN")` to DELETE routes
2. Add `requireOwnershipOrAdmin(getOwnerId)` to PUT/PATCH routes (where applicable)
3. Scope GET list by `createdById` for USER (return all for ADMIN)
4. For catalogs (action-types, equipment-categories): add `requireRole("ADMIN")` to POST/PUT/PATCH/DELETE

**Verification:**
- `pnpm --filter api build` passes
- Manual smoke test:
  - Login as USER, attempt DELETE on any resource → 403
  - Login as USER, attempt PUT on someone else's client → 403
  - Login as USER, create and edit own client → 200
  - Login as ADMIN, delete any client → 200

### PR-C: Frontend Role-Aware UI (~450 lines, MEDIUM risk)

**Tasks:**

1. Update `apps/web/src/stores/auth.ts` — add `role`, `isAdmin`, `canEdit`, `canDelete`
2. Create `apps/web/src/composables/useAuth.ts` — wrap store
3. Add `v-if` guards in 10+ components/views:
   - `ClientListPage.vue` — delete action
   - `ClientDetailPage.vue` — delete client, delete equipment, delete software
   - `MaintenanceFlowPage.vue` — remove item, remove attachment
   - `ClientCard.vue` — delete menu item
   - `EquipmentList.vue` — delete button
   - `EquipmentForm.vue` — category delete
   - `PhotoUpload.vue` — remove attachment
   - Catalog forms (action-types, equipment-categories) — hide create/edit for USER
4. Create `apps/web/src/views/AdminUsersPage.vue` — admin user management view
5. Create `apps/web/src/stores/users.ts` — Pinia store for user CRUD
6. Create `apps/web/src/components/users/` — UserList, UserCreateForm, UserRoleSelect
7. Update `apps/web/src/components/layout/AppNav.vue` — add "Usuarios" nav item (ADMIN-only)
8. Update `apps/web/src/router/index.ts` — add `/admin/users` route (optional: add route guard)

**Verification:**
- `pnpm --filter web build` passes
- Manual:
  - Login as USER, verify delete buttons hidden
  - Login as USER, verify edit buttons visible only for own records
  - Login as ADMIN, verify "Usuarios" nav visible
  - Login as ADMIN, create a user, change role, delete user

## 10. Verification Approach

### Per-PR Build Verification

```bash
pnpm --filter api build    # Typecheck + compile
pnpm --filter web build    # Typecheck + compile
```

Both must pass before merge.

### Manual Smoke Test Plan

**PR-A:**
- Login as admin, verify `role: "ADMIN"` in response
- Create a user via POST `/api/users` (as admin) → 201
- Attempt POST `/api/users` as USER → 403
- Refresh token, verify new access token has fresh role

**PR-B:**
- Login as USER, attempt DELETE `/api/clients/:id` → 403
- Login as USER, attempt PUT `/api/clients/:id` on someone else's client → 403
- Login as USER, create own client → 201, verify `createdById` set
- Login as USER, edit own client → 200
- Login as ADMIN, delete any client → 200 (cascade works)
- Login as USER, attempt POST `/api/action-types` → 403
- Login as ADMIN, POST `/api/action-types` → 201

**PR-C:**
- Login as USER, verify delete buttons hidden in UI
- Login as USER, verify edit buttons visible only for own records
- Login as ADMIN, verify "Usuarios" nav visible
- Login as ADMIN, navigate to `/admin/users`
- Create a user via UI
- Change user role via UI
- Delete user via UI (with confirmation)
- Attempt to demote self as last admin → error message
- Attempt to delete last admin → error message

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Cascade delete blast radius**: Client DELETE cascades to equipment, maintenances, attachments, templates, software. If ADMIN-only guard is misapplied, one DELETE wipes a client tree. | Low | Critical | PR-B review must verify every DELETE route has `requireRole("ADMIN")`. Manual smoke test on each endpoint. |
| **15-min demotion window**: Demoted ADMIN retains access token validity for up to 15 min. | Certain | Low | Document as known MVP limitation. Refresh re-reads DB, so worst case is 15 min. Acceptable for internal tool. |
| **Frontend v-if surface area**: 10+ components need gating. Miss one = USER sees delete button, clicks it, gets 403 (confusing UX). | Medium | Medium | Checklist in PR-C description mapping every backend guard to a frontend v-if. Manual QA pass. |
| **createdById backfill NULL**: Existing records get `created_by_id = admin's id` (not NULL). If admin user doesn't exist yet (fresh DB), backfill is skipped. | Low | Low | Migration uses `IF admin_id IS NOT NULL` guard. Fresh DB has no records to backfill. Seed runs after migration. |
| **Last-admin race condition**: Two admins simultaneously try to demote each other. | Very Low | Medium | Use Prisma transaction with count check. Race window is tiny for MVP. |
| **Maintenance ownership ambiguity**: A USER closing a maintenance they created vs. one assigned to them could differ. | Medium | Low | Spec clarifies: `technicianId` is the owner. If the technician is not the creator, the technician can close it. This matches the existing model. |

## Open Questions

**None.** All 8 product decisions are locked. Technical decisions are derived and confirmed.

## Next Step

Ready for `sdd-tasks` to break this design into mechanical work units.
