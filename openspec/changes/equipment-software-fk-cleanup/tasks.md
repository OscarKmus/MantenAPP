# Tasks: Equipment Software FK Cleanup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (all 5 phases) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Types — Break the Dual-FK Contract

- [x] 1.1 In `packages/types/src/models.ts`: remove `softwareId: string | null` from `Equipment` interface; replace `software?: Software | null` with `softwareLicenses?: Software[]`
- [x] 1.2 In `packages/types/src/api.ts`: remove `softwareId?: string | null` from `UpdateEquipmentRequest`

## Phase 2: Backend — Drop Field from Schema, Service, and Prisma

- [x] 2.1 In `apps/api/src/modules/equipment/equipment.schema.ts`: remove `softwareId` from both `createEquipmentSchema` and `updateEquipmentSchema`
- [x] 2.2 In `apps/api/src/modules/equipment/equipment.service.ts`: replace all `include: { software: true }` with `include: { softwareLicenses: true }` (lines ~37, 47, 91, 128); remove `softwareId` from create payload (~line 81) and update handler (~line 118)
- [x] 2.3 In `apps/api/src/modules/inventory/inventory.service.ts`: replace `include: { software: true }` with `include: { softwareLicenses: true }` (line ~41)
- [x] 2.4 In `apps/api/prisma/schema.prisma`: remove `softwareId` field, `software` relation, and `@@index([softwareId])` from `Equipment`; remove `installedOn` relation from `Software`

## Phase 3: Prisma Migration — Data Step + Drop Column

- [x] 3.1 Run `pnpm --filter api prisma migrate dev --name remove_equipment_software_id` to generate migration scaffold
- [x] 3.2 Replace generated SQL with the data-migration script (loop over `equipment.software_id`, update `software.equipment_id` where null, `RAISE NOTICE` on conflict) followed by `ALTER TABLE "equipment" DROP COLUMN IF EXISTS "software_id"`

## Phase 4: Frontend List Views — Render softwareLicenses Array

- [x] 4.1 In `apps/web/src/components/equipment/EquipmentList.vue`: replace single `eq.software` badge with `v-for` over `eq.softwareLicenses` using flex-wrap; update detail modal to iterate `selectedEquipment.softwareLicenses` with "Sin software instalado" empty state
- [x] 4.2 In `apps/web/src/views/InventoryPage.vue`: same transformation — card badge flex-wrap over `softwareLicenses` array and detail modal iteration with empty state

## Phase 5: Frontend Form — Remove Software Dropdown

- [x] 5.1 In `apps/web/src/components/equipment/EquipmentForm.vue`: remove `Software` type import (line 3), `clientSoftware` ref (line 33), `softwareId` from form ref (line 43) and edit-mode watcher (line 69), `clientSoftware` loader watcher (lines 79–95), `getSoftwareExpirationColor` and `getSoftwareExpirationLabel` helpers (lines 108–125), `softwareId` from submit handler (line 166), and the `<select id="eq-software">` dropdown markup (lines 421–445)

## Phase 6: Cleanup — Remove Dead Endpoint and Grep for Leftovers

- [x] 6.1 In `apps/api/src/modules/software/software.controller.ts`: remove `GET /clients/:clientId/software` route handler (lines 90–104) and the `listSoftwareByClient` import (line 9)
- [x] 6.2 In `apps/api/src/modules/software/software.service.ts`: remove `listSoftwareByClient` function (lines 100–113)
- [x] 6.3 Grep monorepo for `Equipment.softwareId`, `equipment\.software[^L]`, and `GET.*software` to verify zero leftover references
- [x] 6.4 Run `npx vue-tsc --noEmit` in `apps/web` and `pnpm --filter api build` in `apps/api` to verify typecheck passes
