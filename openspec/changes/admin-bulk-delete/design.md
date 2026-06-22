# Design: admin-bulk-delete

## Technical Approach

Add a shared admin-password gate (env-driven, short-lived JWT) and multi-select bulk-delete UX to the Clients and Equipment list pages. The admin gate is a new `modules/admin/` module following the existing module pattern. Bulk-delete endpoints are POST routes on the existing `clients` and `equipment` routers, protected by a new `requireAdminToken` middleware. Cascade preview endpoints are read-only counters that reuse existing Prisma relations. The UI introduces a composable for multi-select state, a toast system (replacing `alert()` in changed pages only), and two controlled modals (cascade preview + admin password) wired through a floating bulk-action bar.

## Architecture Decisions

| # | Decision | Choice | Alternatives considered | Rationale |
|---|----------|--------|------------------------|-----------|
| 1 | Bulk endpoint HTTP method | `POST /api/clients/bulk-delete`, `POST /api/equipment/bulk-delete` | `DELETE /api/clients/bulk` | DELETE-with-body is legal in Express 5 but discouraged; POST is explicit, easier to log, and avoids proxy/firewall quirks |
| 2 | Rate-limit strategy | `express-rate-limit`, in-memory store, 5 req / 15 min / IP | Redis-backed store, custom middleware | Single-instance MVP; in-memory is zero-infra. Upgrade path: swap store to `rate-limit-redis` when scaling horizontally |
| 3 | HMAC key derivation | `crypto.createHmac('sha256', ADMIN_PASSWORD)` directly | HKDF, argon2id-derived key | `ADMIN_PASSWORD` enforced ≥ 12 chars at boot; HMAC-SHA256 with 12+ char secret is acceptable for MVP. Upgrade path: swap to HKDF if entropy requirements increase |
| 4 | Password comparison | SHA-256 hash both sides → `crypto.timingSafeEqual` on 32-byte buffers | Direct `===`, argon2 verify | Constant-time comparison prevents timing attacks; hashing before compare adds defense-in-depth without argon2's cost (this is a shared secret, not a user password) |
| 5 | Admin token scope | Separate JWT signed with `ADMIN_PASSWORD` as HMAC key, `sub: 'admin'`, 5-min TTL | Reuse user JWT + admin flag, API key header | Orthogonal to user auth; no RBAC needed; token invalidation is automatic on password rotation (env change + restart) |
| 6 | UI feedback pattern | New `<Toast>` component via context provider + `useToast()` composable | `alert()`, third-party toast lib | Replaces `alert()` in changed pages only (not full app migration); no new dependency; follows Vue 3 Composition API pattern |
| 7 | Loading indicator | Button-state spinner; global overlay if > 3 s | Progress modal, per-row progress | Bulk deletes complete in < 2 s normally; full-button spinner is simplest. Global overlay already exists in store `loading` state |
| 8 | Single delete unchanged | Existing `DELETE /:id` keeps `prompt()`/`confirm()` + cascade, no admin token | Require admin token for all deletes | Spec explicitly requires no change to single-delete flow; avoids breaking existing UX |
| 9 | Audit log | Defer to follow-up; only log verify attempts server-side | Full audit trail in this slice | Keeps slice focused; verify logs (IP + outcome) are sufficient for MVP security |
| 10 | Cascade preview auth | Standard user JWT only (no admin token) | Require admin token | Preview is read-only; admin gate is for destructive ops only |

## Data Flow

```
ClientListPage / EquipmentListPage
    │
    ├── [1] User checks rows → useMultiSelect → selectedIds: Set<string>
    │
    ├── [2] BulkActionBar appears → "Borrar N clientes/equipos"
    │
    ├── [3] Click → POST /api/clients/cascade-preview { ids }
    │              → CascadePreviewModal shows breakdown
    │
    ├── [4] "Continuar" → AdminPasswordModal opens
    │
    ├── [5] "Confirmar" → POST /api/admin/verify { password }
    │              → 200 { token, expiresIn: 300 }
    │
    ├── [6] POST /api/clients/bulk-delete { ids }
    │       Headers: Authorization: Bearer <adminToken>
    │       → prisma.$transaction → cascade delete
    │
    └── [7] 200 → toast.success → clear selection → refetch list
         4xx → toast.error with mapped message → keep selection
```

### Backend request pipeline (bulk-delete)

```
POST /api/clients/bulk-delete
  │
  ├─ authMiddleware          → verify user JWT (existing)
  ├─ requireAdminToken       → verify admin JWT (new)
  ├─ validate(bulkDeleteSchema) → zod: { ids: string[](1..100) }
  └─ bulkDeleteClients()     → service: pre-validate → $transaction → cascade
```

## File Changes

### Backend — New files

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/modules/admin/admin.controller.ts` | Create | `POST /api/admin/verify` route handler |
| `apps/api/src/modules/admin/admin.service.ts` | Create | Password compare (timingSafeEqual), token sign/verify |
| `apps/api/src/modules/admin/admin.schema.ts` | Create | Zod schema: `verifySchema = z.object({ password: z.string().min(1) })` |
| `apps/api/src/modules/admin/admin.middleware.ts` | Create | `requireAdminToken` — extracts Bearer token, verifies, attaches `req.adminToken` |
| `apps/api/src/modules/admin/admin.limiter.ts` | Create | `express-rate-limit` config: 5 / 15 min / IP, keyGenerator: `req.ip` |
| `apps/api/src/middleware/boot-guard.ts` | Create | Validates `ADMIN_PASSWORD` presence + min length at boot |

### Backend — Modified files

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/config/env.ts` | Modify | Add `ADMIN_PASSWORD: z.string().min(12)` to Zod schema |
| `apps/api/src/index.ts` | Modify | Mount `adminRouter` at `/api/admin`; call `bootGuard()` before `app.listen()` |
| `apps/api/src/modules/clients/clients.controller.ts` | Modify | Add `POST /bulk-delete` (with `requireAdminToken`) and `POST /cascade-preview` |
| `apps/api/src/modules/clients/clients.service.ts` | Modify | Add `bulkDeleteClients(ids)` and `cascadePreviewClients(ids)` |
| `apps/api/src/modules/clients/clients.schema.ts` | Modify | Add `bulkDeleteSchema`, `cascadePreviewSchema` |
| `apps/api/src/modules/equipment/equipment.controller.ts` | Modify | Add `POST /equipment/bulk-delete` and `POST /equipment/cascade-preview` |
| `apps/api/src/modules/equipment/equipment.service.ts` | Modify | Add `bulkDeleteEquipment(ids)` and `cascadePreviewEquipment(ids)` |
| `apps/api/src/modules/equipment/equipment.schema.ts` | Modify | Add `bulkDeleteSchema`, `cascadePreviewSchema` |
| `apps/api/.env.example` | Modify | Add `ADMIN_PASSWORD=` placeholder |

### Frontend — New files

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/composables/useToast.ts` | Create | Toast context + `useToast()` composable: `success()`, `error()`, `info()` |
| `apps/web/src/components/layout/ToastProvider.vue` | Create | Context provider, auto-dismiss queue (4 s), renders toast stack |
| `apps/web/src/composables/useMultiSelect.ts` | Create | `selectedIds: Set<string>`, `toggleOne()`, `toggleAll()`, `clear()`, `someSelected`, `isAllSelected` |
| `apps/web/src/components/AdminPasswordModal.vue` | Create | Password input + verify flow; emits `success(token)` / `cancel` |
| `apps/web/src/components/CascadePreviewModal.vue` | Create | Shows entity breakdown; emits `confirm` / `cancel` |
| `apps/web/src/components/BulkActionBar.vue` | Create | Floating bar: "Borrar N clientes/equipos" button + selection count |

### Frontend — Modified files

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/App.vue` | Modify | Wrap layout with `<ToastProvider>` |
| `apps/web/src/views/ClientListPage.vue` | Modify | Add checkbox column, select-all header, BulkActionBar, modal wiring, replace `alert()` with `useToast()` |
| `apps/web/src/components/clients/ClientCard.vue` | Modify | Accept `selected` prop + `toggle` emit; render checkbox |
| `apps/web/src/components/equipment/EquipmentList.vue` | Modify | Add checkbox column, select-all, BulkActionBar, modal wiring, replace `alert()` with `useToast()` |
| `apps/web/src/stores/clients.ts` | Modify | Add `bulkDeleteClients(ids, adminToken)` action |
| `apps/web/src/stores/equipment.ts` | Modify | Add `bulkDeleteEquipment(ids, adminToken)` action |
| `apps/web/src/lib/api.ts` | Modify | No change needed — admin token passed via `Authorization` header per-request (not cookie) |

## Interfaces / Contracts

### Backend API contracts

```typescript
// POST /api/admin/verify
// Request:  { password: string }
// Response: 200 { ok: true, token: string, expiresIn: 300 }
//           401 { error: "invalid_password" }
//           400 { error: "Validation error", details: [...] }
//           429 { error: "rate_limited", retryAfter: number }

// POST /api/clients/bulk-delete
// Headers:  Authorization: Bearer <adminToken>
// Request:  { ids: string[] }  (1 ≤ length ≤ 100)
// Response: 200 { deleted: number, ids: string[] }
//           207 { deleted: string[], skipped: { id: string, reason: string }[] }
//           400 { error: "batch_too_large" | "validation_error" }
//           401 { error: "admin_token_invalid" | "admin_token_expired" }

// POST /api/clients/cascade-preview
// Request:  { ids: string[] }
// Response: 200 { clients: number, equipment: number, maintenanceItems: number, attachments: number }

// POST /api/equipment/bulk-delete — same shape as clients
// POST /api/equipment/cascade-preview
// Response: 200 { equipment: number, maintenanceItems: number, attachments: number }
```

### Admin JWT claims

```typescript
{ sub: "admin", iat: number, exp: number }  // exp = iat + 300
```

### Frontend composable contracts

```typescript
// useMultiSelect<T extends { id: string }>(items: T[])
//   → { selectedIds: Set<string>, someSelected: boolean, isAllSelected: boolean,
//       toggleOne(id: string), toggleAll(), clear() }

// useToast()
//   → { success(msg: string), error(msg: string), info(msg: string) }
```

## Cascade Preview Query Strategy

For clients, the preview runs 4 count queries (not a single JOIN to avoid fan-out):

```
1. SELECT COUNT(*) FROM clients WHERE id IN ($ids)
2. SELECT COUNT(*) FROM equipment WHERE client_id IN ($ids)
3. SELECT COUNT(*) FROM maintenance_items WHERE equipment_id IN (SELECT id FROM equipment WHERE client_id IN ($ids))
     OR maintenance_id IN (SELECT id FROM maintenances WHERE client_id IN ($ids))
4. SELECT COUNT(*) FROM attachments WHERE
     (scope = 'MAINTENANCE' AND parent_id IN (SELECT id FROM maintenances WHERE client_id IN ($ids)))
     OR (scope = 'MAINTENANCE_ITEM' AND parent_id IN (SELECT id FROM maintenance_items WHERE ...))
```

**Avoid N+1**: all queries use `IN (...)` with subqueries, never per-row. Expected cost: 4 index scans + subqueries on indexed FK columns. For 100 clients this should complete in < 100 ms.

## Cascade Delete Transaction

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Pre-validate all ids exist
  const existing = await tx.client.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length) { /* return skipped */ }

  // 2. Collect attachment paths for file cleanup (post-transaction)
  // 3. Delete attachments (polymorphic — no FK cascade)
  // 4. Delete clients (DB cascade handles: equipment → maintenanceItems, maintenances, templates, software)
});
// Post-transaction: best-effort file cleanup (same pattern as existing deleteClient)
```

**Isolation level**: Prisma default (`ReadCommitted` on PostgreSQL). Serializable is overkill for MVP — the pre-validation + transaction prevents most races. Document the tradeoff.

**Existing cascade logic reuse**: `bulkDeleteClients` calls the same attachment-collection + transaction pattern as `deleteClient`, but for N ids in one transaction. File cleanup is best-effort post-transaction (same as today).

## Error Response Mapping

| Error code | HTTP status | When |
|------------|-------------|------|
| `invalid_password` | 401 | Wrong password on `/verify` |
| `admin_token_invalid` | 401 | Bad signature / malformed admin JWT |
| `admin_token_expired` | 401 | Admin JWT past `exp` |
| `rate_limited` | 429 | > 5 verify attempts in 15 min |
| `batch_too_large` | 400 | `ids.length > 100` |
| `validation_error` | 400 | Zod parse failure |
| `internal_error` | 500 | Unexpected failure |

**Note**: existing endpoints use `{ error: "string" }` envelope. New admin/bulk endpoints use the same pattern — the error codes above are the string values in the `error` field. No new envelope shape introduced.

## Boot Guard

```typescript
// apps/api/src/middleware/boot-guard.ts
import { getEnv } from "../config/env";

export function bootGuard() {
  const env = getEnv(); // ADMIN_PASSWORD already validated by Zod (min 12)
  // Additional runtime check (defense in depth — Zod already enforces min(12))
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12) {
    console.error("FATAL: ADMIN_PASSWORD must be set and >= 12 characters");
    process.exit(1);
  }
}
```

Called in `index.ts` before `app.listen()`. The Zod schema in `env.ts` already enforces `min(12)`, so this is defense-in-depth.

## Security

| Concern | Mitigation |
|---------|-----------|
| Password brute force | Rate limit: 5 / 15 min / IP on `/verify` |
| Timing attack on password compare | `crypto.timingSafeEqual` on SHA-256 hash bytes |
| Token theft within 5-min window | Short TTL; no silent re-auth; rate-limit verify |
| Password in logs | Never logged; only verify outcome + IP logged |
| Token in logs | Never logged server-side |
| HTTPS | Required in production (document in deployment checklist) |
| Weak `ADMIN_PASSWORD` | Zod `min(12)` + boot guard; refuses to start |

## Testing Strategy

No test infrastructure exists. Manual verification checklist:

- [ ] Boot with no `ADMIN_PASSWORD` → server exits with clear error
- [ ] Boot with 8-char `ADMIN_PASSWORD` → server exits (Zod validation)
- [ ] Boot with 16-char `ADMIN_PASSWORD` → server starts normally
- [ ] Wrong password on `/verify` → 401 `invalid_password`
- [ ] Correct password → 200 with token, `expiresIn: 300`
- [ ] 6th `/verify` attempt in 15 min from same IP → 429 `rate_limited`
- [ ] Bulk delete with no admin token → 401 `admin_token_invalid`
- [ ] Bulk delete with expired admin token → 401 `admin_token_expired`
- [ ] Bulk delete with 3 valid client ids → 200, list refetches, equipment gone
- [ ] Cascade preview for 1 client with 3 equipos → returns correct counts
- [ ] UI: select 3 clients → preview → password → toast success
- [ ] UI: wrong password → modal error, input cleared
- [ ] UI: cancel at any step → no state change, no API call
- [ ] UI: existing single delete still uses `prompt()` and works without admin token

## Migration / Rollout

- **No DB migration** — schema unchanged
- **New env var**: `ADMIN_PASSWORD` must be set in all deployment targets
- **New dependency**: `express-rate-limit` (install in `apps/api`)
- **Password rotation**: set new `ADMIN_PASSWORD` value → restart API → all existing admin tokens invalidated (signed with old key)
- **Backward compatible**: existing single-delete flows unchanged; no breaking API changes

## Open Questions for User

1. **Admin password rotation**: env-var + restart (current design), or do you want a "rotate password" admin endpoint in a follow-up?
2. **Admin token scope for follow-ups**: should the admin token work for other destructive ops (e.g., single-client delete, category deletion) in future slices, or stay scoped to bulk-delete only?
3. **Cascade preview threshold**: should the preview modal be skipped when cascade totals are zero (go straight to password), or always show for confirmation?

## Out of Scope

- New user role / RBAC system
- Admin password rotation UI
- Full audit log of deleted entities
- Bulk delete for maintenances, attachments, categories, software, templates
- Mobile native apps
- Test infrastructure setup (deferred)
