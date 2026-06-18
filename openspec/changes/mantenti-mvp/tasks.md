# Tasks: Mantenti MVP

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,700 |
| 400-line budget risk | Critical |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Critical

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: monorepo, DB, auth, Vue shell, login | PR 1 | Base: main. Includes Prisma schema + migration + seed. |
| 2 | Clients + Equipment CRUD (backend + frontend) | PR 2 | Base: main (after PR 1 merges). ~800 lines. |
| 3 | Maintenance workflow + attachments + signature | PR 3 | Base: main (after PR 2 merges). ~900 lines. |
| 4 | PDF generation + templates | PR 4 | Base: main (after PR 3 merges). ~950 lines. |
| 5 | History + notifications + web push | PR 5 | Base: main (after PR 4 merges). ~610 lines. |

---

## Slice 1: Foundation (PR 1 — ~870 lines)

- [ ] 1.1 Init monorepo: root `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`
  - **Files**: `C:\Users\User\Desktop\Peguita\Codigos wao\APP manten\package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`
  - **Estimate**: 40 lines

- [ ] 1.2 Create Prisma schema with all 9 models (User, Client, Equipment, ActionType, Maintenance, MaintenanceItem, Attachment, Template, TemplateItem, Notification, PushSubscription) + enums
  - **Files**: `apps\api\prisma\schema.prisma`
  - **Estimate**: 150 lines

- [ ] 1.3 Write seed script: 5 default action types (Mantención preventiva, Corrección, Reemplazo, Instalación, Otro)
  - **Files**: `apps\api\prisma\seed.ts`
  - **Estimate**: 30 lines

- [ ] 1.4 Create shared types package: `@mantenti/types` with domain models + API DTOs
  - **Files**: `packages\types\package.json`, `packages\types\tsconfig.json`, `packages\types\src\index.ts`, `packages\types\src\models.ts`, `packages\types\src\api.ts`
  - **Estimate**: 80 lines

- [ ] 1.5 Bootstrap Express app: `index.ts`, zod-validated env config, cors, cookie-parser, error-handler middleware
  - **Files**: `apps\api\package.json`, `apps\api\tsconfig.json`, `apps\api\src\index.ts`, `apps\api\src\config\env.ts`, `apps\api\src\middleware\error-handler.ts`
  - **Estimate**: 120 lines

- [ ] 1.6 Create Prisma singleton client + validate Zod env schema
  - **Files**: `apps\api\src\lib\prisma.ts`
  - **Estimate**: 20 lines

- [ ] 1.7 Implement auth middleware: JWT verification from httpOnly cookie, attach `req.user`
  - **Files**: `apps\api\src\middleware\auth.ts`
  - **Estimate**: 50 lines

- [ ] 1.8 Implement auth module: login (bcrypt + JWT access/refresh), logout, me, refresh endpoints + Zod schemas
  - **Files**: `apps\api\src\modules\auth\auth.controller.ts`, `apps\api\src\modules\auth\auth.service.ts`, `apps\api\src\modules\auth\auth.schema.ts`
  - **Estimate**: 150 lines

- [ ] 1.9 Create validate middleware (Zod request validation wrapper)
  - **Files**: `apps\api\src\middleware\validate.ts`
  - **Estimate**: 25 lines

- [ ] 1.10 Add healthcheck route `GET /api/health`
  - **Files**: `apps\api\src\index.ts` (modify — add route)
  - **Estimate**: 10 lines

- [ ] 1.11 Scaffold Vue 3 + Vite + Tailwind frontend: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `index.html`, `main.ts`, `App.vue`
  - **Files**: `apps\web\package.json`, `apps\web\vite.config.ts`, `apps\web\tailwind.config.ts`, `apps\web\tsconfig.json`, `apps\web\index.html`, `apps\web\src\main.ts`, `apps\web\src\App.vue`
  - **Estimate**: 100 lines

- [ ] 1.12 Create axios API client with JWT refresh interceptor + Pinia auth store
  - **Files**: `apps\web\src\lib\api.ts`, `apps\web\src\stores\auth.ts`
  - **Estimate**: 80 lines

- [ ] 1.13 Create Vue router with auth guard: `/login`, `/` → redirect `/clients`
  - **Files**: `apps\web\src\router\index.ts`
  - **Estimate**: 35 lines

- [ ] 1.14 Build `LoginPage.vue`: username/password form, calls login, redirects on success
  - **Files**: `apps\web\src\views\LoginPage.vue`
  - **Estimate**: 80 lines

- [ ] 1.15 Build layout shell: `AppHeader.vue`, `AppNav.vue` with responsive sidebar/drawer
  - **Files**: `apps\web\src\components\layout\AppHeader.vue`, `apps\web\src\components\layout\AppNav.vue`
  - **Estimate**: 100 lines

---

## Slice 2: Clients + Equipment CRUD (PR 2 — ~800 lines)

- [ ] 2.1 Implement clients module: CRUD routes, service (create, list, get, update, delete with 409 on history), next-maintenance calc
  - **Files**: `apps\api\src\modules\clients\clients.controller.ts`, `apps\api\src\modules\clients\clients.service.ts`, `apps\api\src\modules\clients\clients.schema.ts`
  - **Estimate**: 180 lines

- [ ] 2.2 Implement equipment module: CRUD routes under `/api/clients/:clientId/equipment`, status filter, 409 on maintenance history
  - **Files**: `apps\api\src\modules\equipment\equipment.controller.ts`, `apps\api\src\modules\equipment\equipment.service.ts`, `apps\api\src\modules\equipment\equipment.schema.ts`
  - **Estimate**: 140 lines

- [ ] 2.3 Create Pinia client store + equipment store
  - **Files**: `apps\web\src\stores\clients.ts`, `apps\web\src\stores\equipment.ts`
  - **Estimate**: 80 lines

- [ ] 2.4 Build `ClientListPage.vue`: responsive card grid (375px stack), search, next-maintenance badge
  - **Files**: `apps\web\src\views\ClientListPage.vue`
  - **Estimate**: 120 lines

- [ ] 2.5 Build `ClientCard.vue`: name, contact, location, next-maintenance date, tappable ≥44px
  - **Files**: `apps\web\src\components\clients\ClientCard.vue`
  - **Estimate**: 60 lines

- [ ] 2.6 Build `ClientForm.vue`: create/edit form with name, location, contact fields, frequency days
  - **Files**: `apps\web\src\components\clients\ClientForm.vue`
  - **Estimate**: 100 lines

- [ ] 2.7 Build `ClientDetailPage.vue`: tabbed layout (equipment, templates, history)
  - **Files**: `apps\web\src\views\ClientDetailPage.vue`
  - **Estimate**: 80 lines

- [ ] 2.8 Build `EquipmentList.vue`: filterable list by status, add/edit/delete actions
  - **Files**: `apps\web\src\components\equipment\EquipmentList.vue`
  - **Estimate**: 80 lines

- [ ] 2.9 Build `EquipmentForm.vue`: fields for name, IP, MAC, serial, assignedTo, status dropdown
  - **Files**: `apps\web\src\components\equipment\EquipmentForm.vue`
  - **Estimate**: 80 lines

- [ ] 2.10 Add client + equipment routes to Vue router
  - **Files**: `apps\web\src\router\index.ts` (modify)
  - **Estimate**: 20 lines

---

## Slice 3: Maintenance Workflow + Attachments (PR 3 — ~900 lines)

- [ ] 3.1 Implement action-types module: CRUD routes, inline create, 409 on used-type delete
  - **Files**: `apps\api\src\modules\action-types\action-types.controller.ts`, `apps\api\src\modules\action-types\action-types.service.ts`, `apps\api\src\modules\action-types\action-types.schema.ts`
  - **Estimate**: 100 lines

- [ ] 3.2 Implement maintenances module: create (manual + template), get, update status/notes, update item, list
  - **Files**: `apps\api\src\modules\maintenances\maintenances.controller.ts`, `apps\api\src\modules\maintenances\maintenances.service.ts`, `apps\api\src\modules\maintenances\maintenances.schema.ts`
  - **Estimate**: 180 lines

- [ ] 3.3 Implement attachments module: upload (multipart, scope+parentId), stream, delete; 10MB + 20-photo limits
  - **Files**: `apps\api\src\modules\attachments\attachments.controller.ts`, `apps\api\src\modules\attachments\attachments.service.ts`
  - **Estimate**: 120 lines

- [ ] 3.4 Create storage abstraction + local filesystem provider
  - **Files**: `apps\api\src\services\storage\storage.provider.ts`, `apps\api\src\services\storage\local.provider.ts`
  - **Estimate**: 80 lines

- [ ] 3.5 Create Pinia action-types store + maintenance-draft store
  - **Files**: `apps\web\src\stores\action-types.ts`, `apps\web\src\stores\maintenance-draft.ts`
  - **Estimate**: 60 lines

- [ ] 3.6 Build `MaintenanceStartPage.vue`: equipment selector (manual checkboxes) + template selector
  - **Files**: `apps\web\src\views\MaintenanceStartPage.vue`
  - **Estimate**: 120 lines

- [ ] 3.7 Build `MaintenanceFlowPage.vue` + `StepIndicator.vue`: 4-step wizard (items → report → signature → done)
  - **Files**: `apps\web\src\views\MaintenanceFlowPage.vue`, `apps\web\src\components\maintenance\StepIndicator.vue`
  - **Estimate**: 100 lines

- [ ] 3.8 Build `ItemCard.vue`: per-item form with action type select (+ inline create), observations textarea
  - **Files**: `apps\web\src\components\maintenance\ItemCard.vue`, `apps\web\src\components\maintenance\ActionTypeSelect.vue`
  - **Estimate**: 100 lines

- [ ] 3.9 Build `PhotoUpload.vue`: client-side resize (1920px, JPEG 0.85), progress bar, 10MB validation
  - **Files**: `apps\web\src\components\maintenance\PhotoUpload.vue`, `apps\web\src\composables\usePhotoResize.ts`
  - **Estimate**: 80 lines

- [ ] 3.10 Add maintenance + attachment + action-type routes to Vue router
  - **Files**: `apps\web\src\router\index.ts` (modify)
  - **Estimate**: 20 lines

- [ ] 3.11 Create `storage/` directory structure (attachments/, pdfs/, signatures/) + .gitkeep
  - **Files**: `storage\attachments\.gitkeep`, `storage\pdfs\.gitkeep`, `storage\signatures\.gitkeep`
  - **Estimate**: 5 lines

---

## Slice 4: PDF + Templates (PR 4 — ~950 lines)

- [ ] 4.1 Implement close endpoint: validate signature, save base64 PNG, set status CLOSED, trigger async PDF gen
  - **Files**: `apps\api\src\modules\maintenances\maintenances.controller.ts` (modify), `apps\api\src\modules\maintenances\maintenances.service.ts` (modify)
  - **Estimate**: 80 lines

- [ ] 4.2 Create Puppeteer browser singleton (lazy-init, RSS limit 512MB, auto-respawn)
  - **Files**: `apps\api\src\lib\puppeteer.ts`
  - **Estimate**: 50 lines

- [ ] 4.3 Create maintenance report Handlebars template (A4, header, items table, photos grid, signature block)
  - **Files**: `apps\api\src\services\pdf\templates\maintenance-report.hbs`
  - **Estimate**: 120 lines

- [ ] 4.4 Implement Puppeteer PDF renderer: render HTML → page.pdf() → write to storage
  - **Files**: `apps\api\src\services\pdf\puppeteer.renderer.ts`
  - **Estimate**: 80 lines

- [ ] 4.5 Implement PDFKit fallback renderer: simplified text + images layout
  - **Files**: `apps\api\src\services\pdf\pdfkit.renderer.ts`
  - **Estimate**: 100 lines

- [ ] 4.6 Implement PDF service: orchestrate Puppeteer→PDFKit fallback, store path in DB, recalculate next-maintenance
  - **Files**: `apps\api\src\services\pdf\pdf.service.ts`
  - **Estimate**: 80 lines

- [ ] 4.7 Implement PDF download endpoint: `GET /api/maintenances/:id/pdf` → stream file
  - **Files**: `apps\api\src\modules\maintenances\maintenances.controller.ts` (modify)
  - **Estimate**: 30 lines

- [ ] 4.8 Build `SignaturePad.vue`: `signature_pad` canvas (300×100 min), clear, export base64
  - **Files**: `apps\web\src\components\maintenance\SignaturePad.vue`
  - **Estimate**: 80 lines

- [ ] 4.9 Build `PdfStatus.vue`: generating/ready indicator on completion step
  - **Files**: `apps\web\src\components\maintenance\PdfStatus.vue`
  - **Estimate**: 30 lines

- [ ] 4.10 Implement templates module: CRUD routes under `/api/clients/:clientId/templates`, name uniqueness per client
  - **Files**: `apps\api\src\modules\templates\templates.controller.ts`, `apps\api\src\modules\templates\templates.service.ts`, `apps\api\src\modules\templates\templates.schema.ts`
  - **Estimate**: 120 lines

- [ ] 4.11 Build `TemplateSelector.vue`: list templates, start maintenance from template
  - **Files**: `apps\web\src\components\templates\TemplateSelector.vue`
  - **Estimate**: 80 lines

- [ ] 4.12 Add template routes to Vue router + client detail templates tab
  - **Files**: `apps\web\src\router\index.ts` (modify), `apps\web\src\views\ClientDetailPage.vue` (modify)
  - **Estimate**: 20 lines

- [ ] 4.13 Add Puppeteer + PDFKit + Handlebars dependencies to `apps/api/package.json`
  - **Files**: `apps\api\package.json` (modify)
  - **Estimate**: 10 lines

---

## Slice 5: History + Notifications (PR 5 — ~610 lines)

- [ ] 5.1 Implement client history endpoint: `GET /api/clients/:id/history` with pagination, ordered by date desc
  - **Files**: `apps\api\src\modules\clients\clients.controller.ts` (modify), `apps\api\src\modules\clients\clients.service.ts` (modify)
  - **Estimate**: 50 lines

- [ ] 5.2 Build `MaintenanceHistoryList.vue`: chronological list, date/tech/count, expandable row with items
  - **Files**: `apps\web\src\components\history\MaintenanceHistoryList.vue`
  - **Estimate**: 120 lines

- [ ] 5.3 Add PDF download button per history row (disabled + "Generating..." when pdfPath is null)
  - **Files**: `apps\web\src\components\history\MaintenanceHistoryList.vue` (modify)
  - **Estimate**: 30 lines

- [ ] 5.4 Implement notifications module: list (unreadOnly), mark-read, read-all endpoints
  - **Files**: `apps\api\src\modules\notifications\notifications.controller.ts`, `apps\api\src\modules\notifications\notifications.service.ts`
  - **Estimate**: 80 lines

- [ ] 5.5 Implement push subscription endpoint: `POST /api/push/subscribe`
  - **Files**: `apps\api\src\modules\notifications\notifications.controller.ts` (modify)
  - **Estimate**: 30 lines

- [ ] 5.6 Create notification cron service: daily 09:00 UTC, query clients with next_maintenance_at in {today, +1d, +3d}, dedup, insert notifications
  - **Files**: `apps\api\src\services\notifications\cron.service.ts`
  - **Estimate**: 80 lines

- [ ] 5.7 Create web push service: send to all PushSubscriptions for notified users via VAPID
  - **Files**: `apps\api\src\services\notifications\push.service.ts`
  - **Estimate**: 60 lines

- [ ] 5.8 Create Pinia notification store + composable for push subscription
  - **Files**: `apps\web\src\stores\notifications.ts`, `apps\web\src\composables\usePushSubscription.ts`
  - **Estimate**: 60 lines

- [ ] 5.9 Build `NotificationBell.vue`: bell icon, unread badge, slide-in drawer (mobile) / dropdown (desktop)
  - **Files**: `apps\web\src\components\layout\NotificationBell.vue`
  - **Estimate**: 80 lines

- [ ] 5.10 Build `NotificationsPage.vue`: full notification list with mark-read actions
  - **Files**: `apps\web\src\views\NotificationsPage.vue`
  - **Estimate**: 60 lines

- [ ] 5.11 Create service worker `public/sw.js`: handle push event → showNotification with title/body/icon/data
  - **Files**: `apps\web\public\sw.js`
  - **Estimate**: 30 lines

- [ ] 5.12 Register service worker in `main.ts` + add `node-cron` dependency
  - **Files**: `apps\web\src\main.ts` (modify), `apps\api\package.json` (modify)
  - **Estimate**: 15 lines

- [ ] 5.13 Wire notification bell into `AppHeader.vue`
  - **Files**: `apps\web\src\components\layout\AppHeader.vue` (modify)
  - **Estimate**: 15 lines
