# Proposal: equipment-software-fk-cleanup

## Intent

The Equipment create/edit form has a `Software instalado` dropdown that duplicates work already handled by the SOFTWARE tab (which creates software and assigns it via `Software.equipmentId`). The data model has two parallel FK columns for the same conceptual relationship — `Equipment.softwareId` and `Software.equipmentId` — causing inconsistency: software assigned via the SOFTWARE tab doesn't appear in the equipment detail view (which reads `Equipment.software`). The user chose **full cleanup** (Option B): remove the dropdown, eliminate `Equipment.softwareId` as a column, and make `Software.equipmentId` the single source of truth.

## Scope

### In Scope
- Remove the `Software instalado` `<select>` from `EquipmentForm.vue` (refs, watchers, helpers, type import)
- Update `EquipmentList.vue` and `InventoryPage.vue` to read `softwareLicenses` (array) instead of `software` (single) in card badges and detail modals
- Remove `softwareId` from `@mantenti/types` (`Equipment` interface, `UpdateEquipmentRequest`)
- Remove `softwareId` from backend schemas, services, and Prisma `include` directives
- Remove `softwareId` field and `EquipmentSoftware` relation from Prisma schema
- Add Prisma migration with data migration (skip+log on conflict) and `DROP COLUMN IF EXISTS`
- Remove dead `GET /clients/:clientId/software` endpoint
- Grep monorepo for leftover references and clean up

### Out of Scope
- SOFTWARE tab stays as-is (already uses `Software.equipmentId`)
- `Equipment.softwareLicenses` relation is preserved
- No test runner installation (`strict_tdd: false`)
- `feat/admin-bulk-delete` branch is not touched; conflicts handled at merge time

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `equipment-management`: Equipment-software relationship changes from dual-FK to single-FK via `Software.equipmentId`; equipment detail shows `softwareLicenses` array instead of single `software`; API no longer accepts `softwareId` on create/update

## Approach

Branch `feat/equipment-software-fk-cleanup` from `master` (HEAD `c6d4d9a`). Five phases, each a work-unit commit:

1. **Types first**: update `@mantenti/types` — remove `softwareId`, change `software?` to `softwareLicenses?` array
2. **Backend**: drop field from schemas/service/Prisma schema; create migration with `IF EXISTS` + data-migration SQL; smoke-test endpoints
3. **Frontend list views**: update `EquipmentList.vue` + `InventoryPage.vue` to read `softwareLicenses` array; render as flex-wrap badges with empty state
4. **Frontend form**: remove dropdown from `EquipmentForm.vue`
5. **Cleanup**: remove `GET /clients/:clientId/software` endpoint; grep for leftovers

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/types/src/models.ts` | Modified | Remove `softwareId`, change `software?` → `softwareLicenses?` |
| `packages/types/src/api.ts` | Modified | Remove `softwareId` from `UpdateEquipmentRequest` |
| `apps/api/src/modules/equipment/equipment.schema.ts` | Modified | Remove `softwareId` from both Zod schemas |
| `apps/api/src/modules/equipment/equipment.service.ts` | Modified | Remove `softwareId` handling; `include: { softwareLicenses: true }` |
| `apps/api/src/modules/inventory/inventory.service.ts` | Modified | `include: { softwareLicenses: true }` |
| `apps/api/prisma/schema.prisma` | Modified | Remove `softwareId` field + `EquipmentSoftware` relation from Equipment; remove `installedOn` from Software |
| `apps/api/prisma/migrations/` | New | Migration: data-migrate + `DROP COLUMN IF EXISTS` |
| `apps/web/src/components/equipment/EquipmentForm.vue` | Modified | Remove dropdown, refs, watchers, helpers, type import |
| `apps/web/src/components/equipment/EquipmentList.vue` | Modified | `eq.software` → `eq.softwareLicenses` (array) in badge + detail |
| `apps/web/src/views/InventoryPage.vue` | Modified | Same as EquipmentList — badge + detail |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data migration conflict (Software already assigned elsewhere) | Low | Skip + log WARNING; user re-assigns from SOFTWARE tab |
| `@mantenti/types` breaking change | Med | Grep monorepo first; update all consumers atomically in types-first phase |
| `DROP COLUMN` on environments where column never existed | Low | `DROP COLUMN IF EXISTS` + data migration is no-op when no rows match |
| Detail view regression (single → array rendering) | Med | Flex-wrap badges with empty state; UI review against `web-design-guidelines` |
| Branch coordination with `feat/admin-bulk-delete` | Med | Build on `master`; rebase before merge. Bulk-delete branch will need small rebase for `softwareLicenses` reads |

## Rollback Plan

Revert the merge commit. The data migration only moves data from `Equipment.softwareId` → `Software.equipmentId` where no conflict exists; reverting the code restores the old reads. If the column was already dropped, re-run `prisma migrate deploy` with the previous migration state or manually `ALTER TABLE "equipment" ADD COLUMN "software_id" TEXT` and restore from backup.

## Dependencies

- None external. All changes are internal to the monorepo.

## Success Criteria

- [ ] `npx vue-tsc --noEmit` passes in `apps/web`
- [ ] `pnpm --filter api build` passes in `apps/api`
- [ ] Prisma migration applies cleanly on a representative database; no orphaned `software_id` values
- [ ] Manual smoke: create client → create equipment → SOFTWARE tab → create software → equipment detail shows software in read-only list; form has no software dropdown
- [ ] Zero references to `Equipment.softwareId`, `equipment.software` (singular), or `GET /clients/:clientId/software` remain in the codebase
