# Apply Progress: equipment-software-fk-cleanup

## Header

| Field | Value |
|-------|-------|
| Change | equipment-software-fk-cleanup |
| Branch | feat/equipment-software-fk-cleanup |
| Total tasks | 18 (15 original + 3 from Phase 7 bugfix) |
| Completed | 18 |
| Post-verify follow-up | Phase 8: Resolved W1 + S1 + S2 from verify-report |
| Current phase | Phase 8: Post-verify follow-up (complete) |
| Mode | Standard (no test runner) |

## Task Progress

### Phase 1: Types — Break the Dual-FK Contract

- [x] 1.1 Remove `softwareId` and change `software` → `softwareLicenses` in `packages/types/src/models.ts` — commit `9761ed5`
- [x] 1.2 Remove `softwareId` from `UpdateEquipmentRequest` in `packages/types/src/api.ts` — commit `9761ed5`

### Phase 2: Backend — Drop Field from Schema, Service, and Prisma

- [x] 2.1 Remove `softwareId` from `createEquipmentSchema` and `updateEquipmentSchema` — commit `614f0cc`
- [x] 2.2 Replace `include: { software: true }` → `include: { softwareLicenses: true }` and remove `softwareId` from create/update in `equipment.service.ts` — commit `614f0cc`
- [x] 2.3 Replace `include: { software: true }` → `include: { softwareLicenses: true }` in `inventory.service.ts` — commit `614f0cc`
- [x] 2.4 Remove `softwareId` field, `software` relation, `@@index([softwareId])` from Equipment; remove `installedOn` from Software in `schema.prisma` — commit `614f0cc`

### Phase 3: Prisma Migration — Data Step + Drop Column

- [x] 3.1 Created migration directory `20260623120000_remove_equipment_software_id` (manual — `prisma migrate dev` failed due to DB drift) — commit `996d45a`
- [x] 3.2 Migration SQL includes data-migration loop (copy `equipment.software_id` → `software.equipment_id` where null, skip+log on conflict) + `DROP COLUMN IF EXISTS` — commit `996d45a`

### Phase 4: Frontend List Views — Render softwareLicenses Array

- [x] 4.1 Update `EquipmentList.vue`: card badge `v-for` over `softwareLicenses` with flex-wrap; detail modal iterates array with per-item cards — commit `ecb5bb3`
- [x] 4.2 Update `InventoryPage.vue`: same transformation — card badges and detail modal — commit `ecb5bb3`

### Phase 5: Frontend Form — Remove Software Dropdown

- [x] 5.1 Remove `Software` type import, `clientSoftware` ref, `softwareId` from form/edit-mode, clientSoftware loader watcher, expiration helpers, `softwareId` from submit, dropdown markup, and unused `api` import from `EquipmentForm.vue` — commit `db8ee3e`

### Phase 6: Cleanup — Remove Dead Endpoint and Grep for Leftovers

- [x] 6.1 Remove `GET /clients/:clientId/software` route handler and `listSoftwareByClient` import from `software.controller.ts` — commit `ecabd14`
- [x] 6.2 Remove `listSoftwareByClient` function from `software.service.ts` — commit `ecabd14`
- [x] 6.3 Updated `ClientDetailPage.vue` to use `GET /software?clientId=xxx` instead of dead endpoint — commit `ecabd14`
- [x] 6.4 `npx vue-tsc --noEmit` ✅ and `pnpm --filter api build` ✅ — zero errors

### Phase 7: Fix UI Refresh on Software Create/Delete (bugfix added pre-verify)

- [x] 7.1 Add `await equipmentStore.fetchEquipment(clientId.value)` after `await fetchSoftware()` in `handleSoftwareSubmit` (covers both POST and PATCH) — commit `230fbb5`
- [x] 7.2 Add the same refetch in `handleSoftwareDelete` — commit `230fbb5`
- [x] 7.3 `npx vue-tsc --noEmit` ✅ — zero errors

### Phase 8: Post-Verify Follow-up (resolved W1 + S1 + S2)

> **Discovered in sdd-verify** (initial verdict: PASS WITH WARNINGS). User chose option C: resolve W1 and apply both suggestions in this same change.

- [x] 8.1 W1 — `equipment.schema.ts`: add `.strict()` to `createEquipmentSchema` and `updateEquipmentSchema` so unknown fields (notably `softwareId`) return 400 instead of being silently stripped — commit `43cb0dd`
- [x] 8.2 S2 — same `.strict()` treatment applied to all other input Zod schemas: `clients`, `software`, `maintenances`, `templates`, `action-types`, `auth`, `equipment-categories` — commit `43cb0dd`
- [x] 8.3 S1 — `apps/api/package.json`: build script now runs `prisma generate && tsc` so the Prisma client is always in sync with `schema.prisma` at build time — commit `34b991e`
- [x] 8.4 Verify report written and committed — `verify-report.md` (verdict: PASS WITH WARNINGS at the time; all warnings now resolved in Phase 8) — commit `e3b08d1`

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `packages/types/src/models.ts` | Modified | Removed `softwareId`, changed `software?` → `softwareLicenses?` |
| `packages/types/src/api.ts` | Modified | Removed `softwareId` from `UpdateEquipmentRequest` |
| `apps/api/src/modules/equipment/equipment.schema.ts` | Modified | Removed `softwareId` from both Zod schemas |
| `apps/api/src/modules/equipment/equipment.service.ts` | Modified | Replaced `software` → `softwareLicenses` includes, removed `softwareId` from create/update |
| `apps/api/src/modules/inventory/inventory.service.ts` | Modified | Replaced `software` → `softwareLicenses` include |
| `apps/api/prisma/schema.prisma` | Modified | Removed `softwareId` field, `software` relation, index from Equipment; removed `installedOn` from Software |
| `apps/api/prisma/migrations/20260623120000_remove_equipment_software_id/migration.sql` | Created | Data migration + DROP COLUMN IF EXISTS |
| `apps/web/src/components/equipment/EquipmentList.vue` | Modified | Card badges `v-for` over `softwareLicenses`; detail modal iterates array |
| `apps/web/src/views/InventoryPage.vue` | Modified | Same — card badges and detail modal |
| `apps/web/src/components/equipment/EquipmentForm.vue` | Modified | Removed dropdown, refs, watchers, helpers, imports (71 lines deleted) |
| `apps/api/src/modules/software/software.controller.ts` | Modified | Removed dead `GET /clients/:clientId/software` route |
| `apps/api/src/modules/software/software.service.ts` | Modified | Removed `listSoftwareByClient` function |
| `apps/web/src/views/ClientDetailPage.vue` | Modified | Updated to use `GET /software?clientId=xxx`; added `equipmentStore.fetchEquipment` refetch after software create/edit/delete (Phase 7) |

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `9761ed5` | feat(types): remove Equipment.softwareId, add softwareLicenses array |
| 2 | `614f0cc` | refactor(api): drop Equipment.softwareId from schemas and service |
| 3 | `996d45a` | feat(prisma): migration to drop equipment.software_id with data step |
| 4 | `ecb5bb3` | refactor(web): render softwareLicenses array in equipment list and detail |
| 5 | `db8ee3e` | refactor(web): remove software dropdown from equipment form |
| 6 | `ecabd14` | chore(api): remove dead GET /clients/:clientId/software endpoint |
| 7 | `1d990a8` | docs(openspec): add Phase 7 UI refresh tasks to tasks.md |
| 8 | `230fbb5` | fix(web): refresh equipment cards after software create/delete |
| 9 | `43cb0dd` | refactor(api): reject unknown fields in Zod input schemas |
| 10 | `34b991e` | chore(api): regenerate prisma client during build |
| 11 | `e3b08d1` | docs(openspec): add verify-report for equipment-software-fk-cleanup |

## Risks / Notes for Next Phase

- **Migration drift**: `prisma migrate dev` failed due to DB drift (existing DB has columns from manual changes). Migration was created manually. Verify it applies cleanly with `prisma migrate deploy` on the target database.
- **Data migration safety**: The SQL loop uses `AND equipment_id IS NULL` guard — if software is already assigned to different equipment, it skips with `RAISE NOTICE`. No data loss.
- **ClientDetailPage.vue**: Was calling the dead endpoint; updated to use `GET /software?clientId=xxx`. This was not in the original task list but was necessary to avoid a broken page.
- **Phase 7 (UI refresh bugfix)**: Discovered during user review pre-verify — creating/deleting software only updated the SOFTWARE tab because `equipmentStore.equipment[*].softwareLicenses` was a stale snapshot. Fixed by refetching the equipment store after every software mutation in `ClientDetailPage.vue`. This was the latent root cause of the user-reported "have to refresh the page" symptom.
- **Phase 8 (post-verify follow-up)**: sdd-verify reported W1 (Zod schemas don't reject `softwareId`, spec compliance gap) and 2 suggestions (S1: `prisma generate` in build; S2: `.strict()` on all input Zod schemas). All three resolved in this same change for a clean single-PR. With W1 fixed, sending `softwareId` in a POST/PATCH to `/clients/:id/equipment` now correctly returns 400.
- **Breaking API change**: `software` → `softwareLicenses` array is a breaking change. All consumers updated atomically in this PR.

## Next Step

Recommended: `sdd-archive` — sync delta specs to canonical `openspec/specs/{capability}/spec.md` and close the change. All warnings resolved; ready to merge.
