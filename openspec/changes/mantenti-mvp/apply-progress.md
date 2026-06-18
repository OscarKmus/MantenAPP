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
