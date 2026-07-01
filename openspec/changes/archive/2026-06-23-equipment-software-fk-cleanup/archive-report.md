# Archive Report: equipment-software-fk-cleanup

| Field | Value |
|-------|-------|
| Change | equipment-software-fk-cleanup |
| Branch | feat/equipment-software-fk-cleanup |
| Archived to | `openspec/changes/archive/2026-06-23-equipment-software-fk-cleanup/` |
| Archive date | 2026-06-23 |
| Verdict at archive | PASS — all warnings resolved in Phase 8 |

---

## Specs Synced to Canonical

| Capability | Canonical Path | Action | Details |
|------------|---------------|--------|---------|
| equipment-management | `openspec/specs/equipment-management/spec.md` | Created | 3 ADDED requirements (detail software list, card badges, API read), 1 MODIFIED (CRUD per client with softwareId rejection), 2 REMOVED (create/update dropdowns) |
| software-management | `openspec/specs/software-management/spec.md` | Created | 3 requirements (creation, cardinality, endpoint removed) — full spec, not a delta |

## Archive Contents

- `proposal.md` ✅
- `specs/` ✅ (equipment-management, software-management)
- `design.md` ✅
- `tasks.md` ✅ (18/18 tasks complete)
- `apply-progress.md` ✅
- `verify-report.md` ✅

## Canonical Specs Updated

- `openspec/specs/equipment-management/spec.md` — created
- `openspec/specs/software-management/spec.md` — created

## Migration Note

Run `prisma migrate deploy` on target database before deploy — the migration was created manually due to dev DB drift but the SQL is sound. Unapplied migrations at archive time: `dual-signature`, `remove_equipment_software_id`.

## Branch Status

Ready for PR/merge. Branch: `feat/equipment-software-fk-cleanup`.

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

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
