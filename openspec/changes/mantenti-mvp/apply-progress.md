# Apply Progress: mantenti-mvp

## Slice 5: PDF + Templates — COMPLETE

### Summary

Implemented server-side PDF generation for maintenance reports using `@react-pdf/renderer` (replacing the originally planned Puppeteer stack). The PDF is a professional branded document that includes company header, report metadata, client information, equipment table with action types, photo grid, and dual signatures (technician + client).

### Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **@react-pdf/renderer over Puppeteer** | No Chromium dependency (~0MB RAM vs ~200-400MB). Declarative JSX templates are easier to maintain. Works on small VPS without memory issues. |
| 2 | **Sync PDF generation on close** | Dev simplicity. Close endpoint generates PDF immediately and returns `pdfPath`. Tradeoff: close takes ~1-2s longer. If PDF fails, close still succeeds (graceful degradation). |
| 3 | **No PDFKit fallback** | @react-pdf/renderer has no OOM risk (no Chromium). Fallback unnecessary. |
| 4 | **JSX template over Handlebars** | @react-pdf/renderer uses React JSX natively. Better type safety, IDE support, composability. |

### Files Created

| File | Purpose |
|------|---------|
| `apps/api/src/services/pdf/report-template.tsx` | Professional PDF template (A4, branded header, metadata grid, client section, equipment table, photo grid, signatures, footer) |
| `apps/api/src/services/pdf/pdf.service.ts` | PDF service: `generateMaintenancePdf`, `getMaintenancePdfPath`, `regenerateMaintenancePdf` |
| `apps/web/src/components/maintenance/PdfStatus.vue` | Frontend component: 3-state button (download / generate / generating spinner) |
| `apps/web/src/stores/pdf.ts` | Pinia store: blob→objectURL→click→revoke download flow |

### Files Modified

| File | Change |
|------|--------|
| `apps/api/package.json` | Added `@react-pdf/renderer`, `react`, `@types/react` |
| `apps/api/tsconfig.json` | Added `"jsx": "react-jsx"` for JSX template support |
| `apps/api/src/config/env.ts` | Added `COMPANY_NAME` and `COMPANY_LOGO_URL` env vars |
| `apps/api/src/modules/maintenances/maintenances.controller.ts` | Added PDF download (`GET /:id/pdf`), regenerate (`POST /:id/pdf/regenerate`), updated close to trigger PDF gen |
| `apps/web/src/views/MaintenanceFlowPage.vue` | Step 3 (Done) now shows PdfStatus with download button |
| `apps/web/src/views/ClientDetailPage.vue` | Resumen tab shows latest closed maintenance with PDF download |
| `.env.example` | Added `COMPANY_NAME` and `COMPANY_LOGO_URL` |

### PDF Template Sections (in order)

1. **Header**: Company name + logo placeholder, "Reporte de Mantención" subtitle
2. **Metadata grid**: Report number (MT-YYYYMMDD-{id-suffix}), date, technician, duration
3. **Client section**: Name (large), location, contact, phone, email, next maintenance dates (3-state: base/acordada/efectiva)
4. **Equipment table**: Name, category, IP/MAC/Serial (monospace), action type (colored badge), observations, photos count, completed checkmark
5. **Photos section**: 3-per-row grid with captions
6. **Signatures section**: Technician signature + client signature with names
7. **Footer**: Page number, company name, generation date

### Build Verification

- ✅ `pnpm --filter api build` — passes
- ✅ `pnpm --filter web build` — passes

### Commits

| Hash | Message |
|------|---------|
| `8fa3202` | `chore(deps): add @react-pdf/renderer for PDF generation` |
| `05ad745` | `feat(api): add PDF generation service with branded report template` |
| `1194e5f` | `feat(web): add PDF download/generate buttons to maintenance flow and client detail` |
| `d27f71d` | `chore(slice-5): mark PDF generation tasks complete in tasks.md` |

### Tasks Completed

All 17 Slice 5 tasks (5.1–5.17) marked `[x]` in tasks.md.

### Remaining Work

Slice 6 (History + Notifications) is the final slice:
- Client history endpoint + list view
- Notifications module + web push
- Notification bell component

### Notes for Next Slice

- The `ClientDetailPage.vue` already has a "Historial" tab (currently disabled/placeholder)
- The PDF download button is already in the Resumen tab — Slice 6 should add it per-row in the history list
- The `pdfPath` and `pdfEngine` fields are already in the Maintenance model and shared types

---

## Slice 6: History + Notifications — COMPLETE

### Summary

Implemented client maintenance history endpoint and list view, plus the full notifications module with in-app notifications, web push subscriptions, notification bell, and a dedicated notifications page. Includes daily cron reminders, service worker push handling, and notification preference management.

### Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **History endpoint per client** | Scoped to client, returns closed maintenances with metadata. Keeps queries efficient. |
| 2 | **Web push via web-push npm** | Standard library for VAPID-based push. Works with service workers. |
| 3 | **Daily cron at 09:00 UTC** | Consistent reminder generation. Dedup within 24h prevents spam. |

### Tasks Completed

All Slice 6 tasks marked complete. Archived in `openspec/changes/archive/2026-06-26-mantenti-mvp-slice-6/`.

---

## Slice 6-1: Bulk Operations — COMPLETE

### Summary

Implemented bulk delete and bulk status change operations for clients and equipment. Deferred from slice 6 to keep slice 6 focused on history/notifications.

### Tasks Completed

All Slice 6-1 tasks marked complete. Archived in `openspec/changes/archive/2026-06-26-mantenti-mvp-slice-6-1/`.

---

## Slice 7: Multi-User RBAC — COMPLETE

### Summary

Pivoted MantenApp from single-user to explicit two-role RBAC (USER / ADMIN). Added UserRole enum, JWT role augmentation, middleware factories (requireRole, requireOwnershipOrAdmin), users module with CRUD + last-admin protection, DELETE guards on all 8 endpoints, ownership checks on PUT/PATCH, frontend v-if gating on 17 surfaces, admin user management UI, and Maintenance.technicianId nullable fix.

### Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **USER edit scope: own records only** | Ownership check on PUT/PATCH via createdById/technicianId |
| 2 | **Migration default: all existing users to ADMIN** | Preserves current behavior, no lockout |
| 3 | **ADMIN-only user creation (no self-registration)** | Internal tool, fixed team |
| 4 | **Frontend: hide buttons (not disable)** | Cleaner UX, no confusion |
| 5 | **Admin self-demotion blocked** | Safety guard |
| 6 | **Last-admin protection** | Cannot demote or delete the last admin |
| 7 | **Catalog write: ADMIN-only** | action-types, equipment-categories |
| 8 | **Maintenance ownership: technicianId** | Not createdById |

### PRs Merged

| PR | Hash | Description |
|----|------|-------------|
| PR-A | `22e84ff` | Schema + auth + middleware + users module (~700 lines) |
| PR-B | `108c478` | DELETE guards + ownership checks (~350 lines) |
| PR-C | `adc8498` | Frontend role-aware UI + admin page (~450 lines) |
| Fix-up | `3fef75f` | 10 verify findings resolved (1 CRITICAL + 7 WARNING + 3 SUGGESTION) |

### Specs Synced to Canonical

12 modules: auth, users, clients, equipment, equipment-categories, action-types, maintenances, attachments, templates, software, notifications, push

### Archived

`openspec/changes/archive/2026-06-30-mantenti-mvp-slice-7/`

### Build Verification

- ✅ `pnpm --filter api build` — passes
- ✅ `pnpm --filter web build` — passes

### Outstanding

- Dev DB checksum drift on F1 migration (known issue, not a blocker)
- Push to origin not yet done (archive commit pending)
