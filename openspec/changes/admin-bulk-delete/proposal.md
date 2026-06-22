# Proposal: admin-bulk-delete

## Intent

Destructive operations (client/equipment deletion) currently rely on client-side `prompt()`/`confirm()` with no server-side re-auth. Technicians need faster bulk deletion for cleanup workflows, but mass destructive ops demand a stronger gate. This change adds multi-select bulk delete protected by a shared admin password — no new RBAC role, just an orthogonal password check before irreversible actions.

## Scope

### In Scope
- `ADMIN_PASSWORD` env var (min 12 chars, enforced at boot) + `POST /api/admin/verify` → short-lived JWT (5 min)
- `requireAdminToken` middleware for bulk-delete endpoints
- Multi-select UI (checkboxes + bulk action bar) on Clients list and Equipment list
- Bulk DELETE per entity with cascade handling inside a transaction
- Cascade preview modal before password prompt ("N clients + M equipos + P mantenimientos will be deleted")
- Rate limit on verify endpoint: 5 attempts / 15 min / IP

### Out of Scope
- New user role / RBAC system (admin password is orthogonal to JWT login)
- Admin password rotation UI or settings page
- Audit log of who deleted what (follow-up)
- Bulk delete for maintenances, attachments, categories, software, templates
- Per-user admin elevation or multi-tenant admin

## Capabilities

### New
- `admin-gate`: admin password verify endpoint, short-lived admin JWT, requireAdminToken middleware, rate limiting

### Modified
- `client-management`: multi-select UI + bulk DELETE with cascade preview
- `equipment-management`: multi-select UI + bulk DELETE

## Approach

- **Flow**: checkboxes per row → bulk bar appears → "Borrar N" → cascade preview modal → admin password modal → `POST /api/admin/verify` → token → `DELETE /api/clients/bulk` with `{ ids, token }` → server verifies token, runs existing delete logic per id in transaction → progress feedback + toast summary
- **Token**: HMAC-signed JWT using derived key from `ADMIN_PASSWORD` (HKDF or min-length enforcement), 5-min TTL
- **Batch limit**: 100 ids per request; reject above with clear error
- **Failure mode**: all-or-nothing transaction; on failure return `{ deleted: 0, failed: [{id, reason}] }` with rollback
- **UI**: new `AdminPasswordModal.vue` + `BulkActionBar.vue` + `useMultiSelect` composable (Tailwind, no UI library)
- **Reuse**: existing `authMiddleware` pattern, `jsonwebtoken` lib, Pinia store pattern, `Teleport` modal pattern

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/config/env.ts` | Modified | Add `ADMIN_PASSWORD` to Zod schema |
| `apps/api/src/modules/admin/` | New | Controller, service, middleware for admin gate |
| `apps/api/src/modules/clients/` | Modified | Add bulk DELETE endpoint with cascade |
| `apps/api/src/modules/equipment/` | Modified | Add bulk DELETE endpoint |
| `apps/web/src/composables/useMultiSelect.ts` | New | Multi-select state tracking |
| `apps/web/src/components/AdminPasswordModal.vue` | New | Password input + verify flow |
| `apps/web/src/components/BulkActionBar.vue` | New | Floating bar with delete action |
| `apps/web/src/views/ClientListPage.vue` | Modified | Checkboxes + bulk delete integration |
| `apps/web/src/components/equipment/EquipmentList.vue` | Modified | Checkboxes + bulk delete integration |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Short `ADMIN_PASSWORD` → weak HMAC | Med | Enforce min 12 chars at boot; refuse to start |
| Cascade delete too slow for large batches | Med | 100-id batch limit; transaction with statement timeout |
| No test infrastructure exists | High | Defer tests to verify phase setup; manual QA for initial slice |
| Admin token leaked within 5-min window | Low | Short TTL; no silent re-auth; rate-limit verify endpoint |

## Rollback Plan

Remove admin module, revert list page changes, drop `ADMIN_PASSWORD` from env. No DB migration — bulk delete reuses existing single-delete cascades. Feature flag not needed; routes simply won't exist after revert.

## Dependencies

- `jsonwebtoken` (already installed)
- Node.js `crypto` (built-in, for `timingSafeEqual` + HKDF)
- `ADMIN_PASSWORD` env var set in all deployment targets

## Success Criteria

- [ ] Multi-select checkboxes on Clients and Equipment lists
- [ ] Bulk delete requires admin password via modal
- [ ] Admin token expires in 5 min; expired token re-prompts password
- [ ] Cascade preview shows accurate counts before password prompt
- [ ] Batch limit of 100 enforced server-side
- [ ] Verify endpoint rate-limited (5 attempts / 15 min / IP)
- [ ] Server boots with clear error if `ADMIN_PASSWORD` < 12 chars
- [ ] All-or-nothing transaction: partial failure rolls back completely

## Open Questions

1. **Cascade preview**: show detailed counts modal, or just "N items will be deleted"?
2. **Rate limit strictness**: 5/15min too aggressive? Consider 10/15min for shared-office scenarios.
3. **Audit log**: include in this slice or defer to follow-up?
4. **Single delete**: should existing single-item delete also require admin password, or only bulk?
5. **Bulk for maintenances/attachments**: include in this slice or later?
