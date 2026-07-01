# Design: equipment-software-fk-cleanup

## Context

Make `Software.equipmentId` the single source of truth for the equipment-software relationship. Remove the redundant `Equipment.softwareId` dual-FK path, the equipment form's software dropdown, and the dead `GET /clients/:clientId/software` endpoint. The breaking API change (`software` → `softwareLicenses` array) was explicitly approved by the user with no backward-compat shim.

- Proposal: `openspec/changes/equipment-software-fk-cleanup/proposal.md`
- Specs: `openspec/changes/equipment-software-fk-cleanup/specs/{equipment-management,software-management}/spec.md`

## Data Model

After the change, the Prisma schema has a single FK: `Software.equipmentId`.

```prisma
model Equipment {
  // ... other fields unchanged
  // REMOVED: softwareId, software relation, @@index([softwareId])
  softwareLicenses Software[]  @relation("SoftwareEquipment")
}

model Software {
  // ... other fields unchanged
  equipmentId String?     @map("equipment_id")
  equipment   Equipment?  @relation("SoftwareEquipment", fields: [equipmentId], references: [id], onDelete: SetNull)
  // REMOVED: installedOn
}
```

### Migration SQL

```sql
-- Data migration: copy Equipment.softwareId → Software.equipmentId where not already set
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT e.id AS eq_id, e.software_id AS sw_id
    FROM "equipment" e
    WHERE e.software_id IS NOT NULL
  LOOP
    UPDATE "software"
    SET equipment_id = r.eq_id
    WHERE id = r.sw_id AND equipment_id IS NULL;

    IF NOT FOUND THEN
      RAISE NOTICE 'SKIP: software % already assigned to different equipment (equipment %)', r.sw_id, r.eq_id;
    END IF;
  END LOOP;
END $$;

-- Drop the column
ALTER TABLE "equipment" DROP COLUMN IF EXISTS "software_id";
```

Both statements run inside the implicit transaction that `prisma migrate dev` wraps around each migration file. Environments created via `prisma db push` (no migration history) will have no rows matching the data step — the loop is a no-op, and `DROP COLUMN IF EXISTS` handles the missing column gracefully.

## Type Contract (`@mantenti/types`)

### `packages/types/src/models.ts` — `Equipment` interface

```diff
 export interface Equipment {
   id: string;
   clientId: string;
   categoryId: string | null;
-  softwareId: string | null;
   name: string;
   // ... other fields unchanged
-  software?: Software | null;
+  softwareLicenses?: Software[];
 }
```

### `packages/types/src/api.ts` — `UpdateEquipmentRequest`

```diff
 export interface UpdateEquipmentRequest {
   // ... other fields unchanged
-  softwareId?: string | null;
 }
```

`CreateEquipmentRequest` already has no `softwareId` — no change needed. This is a **breaking change** across the monorepo; all consumers must update atomically.

## Backend

### `apps/api/src/modules/equipment/equipment.schema.ts`

Remove `softwareId` from both `createEquipmentSchema` (line 48) and `updateEquipmentSchema` (line 62). After removal, any request containing `softwareId` will fail Zod validation → 400 Bad Request (satisfies spec scenarios "Create rejects softwareId" / "Update rejects softwareId").

### `apps/api/src/modules/equipment/equipment.service.ts`

| Line | Change |
|------|--------|
| 37, 47, 91, 128 | `include: { software: true }` → `include: { softwareLicenses: true }` |
| 81 | Remove `softwareId: input.softwareId ?? null` from create payload |
| 118 | Remove `if (input.softwareId !== undefined) data.softwareId = input.softwareId` from update |

Affected read methods: `listByClient` (line 37), `getById` (line 47, 91), and the update return (line 128).

### `apps/api/src/modules/equipment/equipment.controller.ts`

No changes expected — pure delegation to service. The response shape change (`software` → `softwareLicenses`) flows through automatically from the service's Prisma `include`.

### `apps/api/src/modules/inventory/inventory.service.ts`

Line 41: `include: { software: true }` → `include: { softwareLicenses: true }` in the equipment query.

### Endpoint removal: `GET /clients/:clientId/software`

| File | Action |
|------|--------|
| `apps/api/src/modules/software/software.controller.ts` lines 90-104 | Remove the route handler |
| `apps/api/src/modules/software/software.service.ts` lines 100-113 | Remove `listSoftwareByClient` function |
| `apps/api/src/modules/software/software.controller.ts` line 9 | Remove `listSoftwareByClient` from import |

Confirmed sole consumer: `EquipmentForm.vue` line 85. After dropdown removal, zero callers remain.

### Prisma schema changes

Remove from `Equipment`: `softwareId` field (line 70), `software` relation (line 85), `@@index([softwareId])` (line 92).
Remove from `Software`: `installedOn` relation (line 126).

## Frontend — Form

### `apps/web/src/components/equipment/EquipmentForm.vue`

| Lines | Action |
|-------|--------|
| 3 | Remove `Software` type import (verify no other usage first via grep) |
| 33 | Remove `clientSoftware` ref |
| 43 | Remove `softwareId: null` from form ref |
| 69 | Remove `softwareId: eq.softwareId ?? null` from edit-mode watcher |
| 79-95 | Remove `clientSoftware` loader (watcher calling `GET /clients/:id/software`) |
| 108-125 | Remove `getSoftwareExpirationColor` and `getSoftwareExpirationLabel` helpers |
| 166 | Remove `data.softwareId = form.value.softwareId \|\| null` from submit handler |
| 421-445 | Remove `<select id="eq-software">` dropdown markup |

All other form fields (name, category, status, network, notes, etc.) remain unchanged.

## Frontend — List Views

### `apps/web/src/components/equipment/EquipmentList.vue`

**Card badge area (lines 301-309):** Replace single `v-if="eq.software"` badge with a flex-wrap of badges iterating `eq.softwareLicenses`. Empty array → no badge area rendered.

```vue
<div v-if="eq.softwareLicenses?.length" class="flex flex-wrap gap-1 mt-1">
  <span v-for="sw in eq.softwareLicenses" :key="sw.id"
        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
    {{ sw.name }}
  </span>
</div>
```

**Detail modal (lines 434-460):** Replace `selectedEquipment.software` single-item render with an iteration over `selectedEquipment.softwareLicenses`. Each item shows: name, license type, expiration date, notes. Empty array → "Sin software instalado" text.

### `apps/web/src/views/InventoryPage.vue`

Same two patterns (card badge lines 381-393, detail modal lines 644-675). Identical transformation as EquipmentList.

### UI design notes

- Flex-wrap (`flex flex-wrap gap-1`) handles 1-N badges without overflow.
- Empty state uses muted text per `empty-states` guideline (ui-ux-pro-max §8).
- Badge color follows existing pattern (blue for software); expiration coloring can be added later if needed.

## Sequencing and Work-Unit Commits

| Phase | Commit message | Scope |
|-------|---------------|-------|
| 1 — Types | `feat(types): remove Equipment.softwareId, add softwareLicenses array` | `packages/types/src/models.ts`, `packages/types/src/api.ts` |
| 2 — Backend | `feat(api): drop Equipment.softwareId from schemas and service` | `equipment.schema.ts`, `equipment.service.ts`, `inventory.service.ts`, `schema.prisma` |
| 2b — Migration | `feat(api): migration to drop equipment.software_id with data step` | New migration file under `prisma/migrations/` |
| 3 — Frontend lists | `feat(web): render softwareLicenses array in equipment list and detail` | `EquipmentList.vue`, `InventoryPage.vue` |
| 4 — Frontend form | `refactor(web): drop software dropdown from equipment form` | `EquipmentForm.vue` |
| 5 — Cleanup | `chore(api): remove dead GET /clients/:clientId/software endpoint` | `software.controller.ts`, `software.service.ts` |

All 5 phases in a single PR (~150-200 changed lines, under the 400-line reviewer-burden threshold and the 1200-line budget). Types-first ensures the breaking change propagates cleanly.

## Verification

| Check | Command | Expected |
|-------|---------|----------|
| Frontend typecheck | `npx vue-tsc --noEmit` (from `apps/web`) | Zero errors |
| Backend typecheck | `pnpm --filter api build` | Zero errors |
| Migration applies | `pnpm --filter api prisma migrate dev` | Clean apply; no row has `software_id` after |
| Smoke: equipment detail | Create equipment + 2 software via SOFTWARE tab → open detail | Shows both as list items |
| Smoke: empty state | Equipment with no software → open detail | Shows "Sin software instalado" |
| Smoke: form | Open equipment create/edit form | No software dropdown present |
| Smoke: dead endpoint | `GET /clients/{id}/software` | Returns 404 |
| Smoke: rejects softwareId | `POST /clients/{id}/equipment` with `softwareId` in body | Returns 400 |
| E2E sanity | `npx tsx e2e-pdf-test.ts` | Produces valid PDF (cross-cutting check) |

## Risks and Mitigations

| Risk | Detail | Mitigation |
|------|--------|------------|
| Data migration conflict | `Software.equipmentId` already set to different equipment | `AND equipment_id IS NULL` guard + `RAISE NOTICE` skip+log. Run on DB copy first; document manual reconciliation. |
| Breaking type change | `@mantenti/types` change breaks both apps if not atomic | Types-first phase; all 5 phases in single PR. `pnpm build` after each phase catches drift. |
| Branch coordination | `feat/admin-bulk-delete` touches `EquipmentList.vue` | Build on `master`; rebase before merge. Conflicts are in different lines (bulk-delete = multi-select state, this = softwareLicenses rendering). |

## Out of Scope

- SOFTWARE tab (already uses `Software.equipmentId` correctly)
- `Equipment.softwareLicenses` relation (preserved, becomes the only path)
- Test runner installation (`strict_tdd: false`)
- `feat/admin-bulk-delete` branch (separate change)

## Open Questions for sdd-tasks

- None — all decisions locked. The task breakdown should follow the 5-phase sequencing above.
