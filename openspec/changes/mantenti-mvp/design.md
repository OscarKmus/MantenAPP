# Design: Mantenti MVP

## Technical Approach

Full-stack responsive web application for IT maintenance technicians. Monorepo (pnpm workspaces) with Express/Prisma/PostgreSQL backend, Vue 3/Vite/Tailwind frontend, and shared TypeScript types. The design follows the locked architecture from the proposal: JWT auth (single role), hybrid next-maintenance model, polymorphic attachments, server-side PDF generation with Puppeteer→PDFKit fallback, and in-app + web push notifications.

## A. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Vue 3 SPA)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Login   │ │ Clients  │ │ Maint.   │ │ Notifications │  │
│  │  Page    │ │  List    │ │  Flow    │ │   Bell/Push   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│         │           │            │              │            │
│         └───────────┴────────────┴──────────────┘            │
│                         │ HTTPS / JSON                       │
│                    Service Worker (push)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                   Express API (Node 20+)                     │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐   │
│  │  Auth  │ │  CRUD    │ │  Maint.  │ │  PDF Generator │   │
│  │  JWT   │ │  Routes  │ │  Workflow│ │  Puppeteer/    │   │
│  │  Cookie│ │  (REST)  │ │  Engine  │ │  PDFKit        │   │
│  └────────┘ └──────────┘ └──────────┘ └────────────────┘   │
│  ┌────────────────┐ ┌──────────────────────────────────┐    │
│  │  Notification  │ │  Attachment Storage              │    │
│  │  Cron (node-   │ │  (local fs → S3-ready)           │    │
│  │   cron)        │ │                                  │    │
│  └────────────────┘ └──────────────────────────────────┘    │
│                         │                                    │
│                    Prisma ORM                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │   PostgreSQL 15+      │
              │   (9 tables)          │
              └───────────────────────┘
```

## B. Data Model

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Users ───────────────────────────────────────────────
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String   @map("password_hash")
  fullName      String   @map("full_name")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  maintenances  Maintenance[]
  notifications Notification[]

  @@map("users")
}

// ─── Clients ─────────────────────────────────────────────
model Client {
  id                      String    @id @default(uuid())
  name                    String
  location                String?
  contactName             String?   @map("contact_name")
  contactPhone            String?   @map("contact_phone")
  contactEmail            String?   @map("contact_email")
  frequencyDays           Int?      @map("frequency_days")
  nextMaintenanceBaseAt   DateTime? @map("next_maintenance_base_at")
  nextMaintenanceAgreedAt DateTime? @map("next_maintenance_agreed_at")
  nextMaintenanceAt       DateTime? @map("next_maintenance_at") // effective
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  equipment     Equipment[]
  maintenances  Maintenance[]
  templates     Template[]

  @@index([nextMaintenanceAt])
  @@map("clients")
}

// ─── Equipment ───────────────────────────────────────────
model Equipment {
  id         String          @id @default(uuid())
  clientId   String          @map("client_id")
  name       String
  ip         String?
  mac        String?
  serial     String?
  assignedTo String?         @map("assigned_to")
  status     EquipmentStatus @default(ACTIVE)
  createdAt  DateTime        @default(now()) @map("created_at")
  updatedAt  DateTime        @updatedAt @map("updated_at")

  client         Client            @relation(fields: [clientId], references: [id])
  maintenanceItems MaintenanceItem[]
  templateItems  TemplateItem[]

  @@index([clientId])
  @@map("equipment")
}

enum EquipmentStatus {
  ACTIVE
  INACTIVE
  UNDER_MAINTENANCE
  DECOMMISSIONED
}

// ─── Action Types ────────────────────────────────────────
model ActionType {
  id        String  @id @default(uuid())
  name      String  @unique
  color     String?
  icon      String?
  isDefault Boolean @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at")

  maintenanceItems MaintenanceItem[]

  @@map("action_types")
}

// ─── Maintenances ────────────────────────────────────────
model Maintenance {
  id          String            @id @default(uuid())
  clientId    String            @map("client_id")
  technicianId String           @map("technician_id")
  status      MaintenanceStatus @default(DRAFT)
  notes       String?
  signatureData String?         @map("signature_data") // base64 PNG
  pdfPath     String?           @map("pdf_path")
  pdfEngine   String?           @map("pdf_engine") // "puppeteer" | "pdfkit"
  closedAt    DateTime?         @map("closed_at")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  client     Client            @relation(fields: [clientId], references: [id])
  technician User              @relation(fields: [technicianId], references: [id])
  items      MaintenanceItem[]
  attachments Attachment[]

  @@index([clientId, createdAt(sort: Desc)])
  @@index([status])
  @@map("maintenances")
}

enum MaintenanceStatus {
  DRAFT
  IN_PROGRESS
  CLOSED
}

// ─── Maintenance Items ───────────────────────────────────
model MaintenanceItem {
  id            String   @id @default(uuid())
  maintenanceId String   @map("maintenance_id")
  equipmentId   String   @map("equipment_id")
  actionTypeId  String?  @map("action_type_id")
  observations  String?
  completedAt   DateTime? @map("completed_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  maintenance Maintenance @relation(fields: [maintenanceId], references: [id], onDelete: Cascade)
  equipment   Equipment   @relation(fields: [equipmentId], references: [id])
  actionType  ActionType? @relation(fields: [actionTypeId], references: [id])
  attachments Attachment[]

  @@unique([maintenanceId, equipmentId])
  @@map("maintenance_items")
}

// ─── Attachments (Polymorphic) ───────────────────────────
model Attachment {
  id           String           @id @default(uuid())
  scope        AttachmentScope
  parentId     String           @map("parent_id")
  fileName     String           @map("file_name")
  mimeType     String           @map("mime_type")
  sizeBytes    Int              @map("size_bytes")
  storagePath  String           @map("storage_path")
  createdAt    DateTime         @default(now()) @map("created_at")

  @@index([scope, parentId])
  @@map("attachments")
}

enum AttachmentScope {
  MAINTENANCE
  MAINTENANCE_ITEM
}

// ─── Templates ───────────────────────────────────────────
model Template {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  client Client         @relation(fields: [clientId], references: [id])
  items  TemplateItem[]

  @@unique([clientId, name])
  @@map("templates")
}

// ─── Template Items ──────────────────────────────────────
model TemplateItem {
  id          String @id @default(uuid())
  templateId  String @map("template_id")
  equipmentId String @map("equipment_id")
  sortOrder   Int    @default(0) @map("sort_order")

  template  Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  equipment Equipment @relation(fields: [equipmentId], references: [id])

  @@unique([templateId, equipmentId])
  @@map("template_items")
}

// ─── Notifications ───────────────────────────────────────
model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String
  body      String
  isRead    Boolean  @default(false) @map("is_read")
  clientId  String?  @map("client_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, isRead, createdAt(sort: Desc)])
  @@map("notifications")
}

// ─── Push Subscriptions ─────────────────────────────────
model PushSubscription {
  id        String @id @default(uuid())
  userId    String @map("user_id")
  endpoint  String @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now()) @map("created_at")

  @@map("push_subscriptions")
}
```

### Next-Maintenance: 3-State Model

| Field | Source | Computed When |
|-------|--------|---------------|
| `next_maintenance_base_at` | `last_closed_maintenance.closed_at + frequency_days` | On maintenance close |
| `next_maintenance_agreed_at` | Technician sets manually | On client edit |
| `next_maintenance_at` (effective) | `agreed_at ?? base_at`, overridable | On any of the above changes |

**Effective date logic** (in service layer, not DB trigger):
```
effective = manual_override ?? agreed_at ?? base_at
```

## C. REST API Contract

### Auth

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/auth/login` | No | `{ username, password }` | `200 { user }` + Set-Cookie |
| POST | `/api/auth/logout` | Yes | — | `204` + Clear-Cookie |
| GET | `/api/auth/me` | Yes | — | `200 { user }` |
| POST | `/api/auth/refresh` | Yes (cookie) | — | `200` + new Set-Cookie |

### Clients

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/clients` | Yes | `?q=&status=` | `200 { clients[] }` |
| POST | `/api/clients` | Yes | `{ name, location, contact*, frequencyDays }` | `201 { client }` |
| GET | `/api/clients/:id` | Yes | — | `200 { client, equipment[], templates[] }` |
| PATCH | `/api/clients/:id` | Yes | partial fields | `200 { client }` |
| DELETE | `/api/clients/:id` | Yes | — | `204` or `409` |
| GET | `/api/clients/:id/history` | Yes | `?page=&limit=` | `200 { maintenances[], total }` |

### Equipment

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/clients/:clientId/equipment` | Yes | `?status=` | `200 { equipment[] }` |
| POST | `/api/clients/:clientId/equipment` | Yes | `{ name, ip, mac, serial, assignedTo, status }` | `201 { equipment }` |
| PATCH | `/api/equipment/:id` | Yes | partial fields | `200 { equipment }` |
| DELETE | `/api/equipment/:id` | Yes | — | `204` or `409` |

### Action Types

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/action-types` | Yes | — | `200 { actionTypes[] }` |
| POST | `/api/action-types` | Yes | `{ name, color?, icon? }` | `201 { actionType }` |
| PATCH | `/api/action-types/:id` | Yes | `{ name?, color?, icon? }` | `200 { actionType }` |
| DELETE | `/api/action-types/:id` | Yes | — | `204` or `409` |

### Maintenances

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/maintenances` | Yes | `{ clientId, equipmentIds[], templateId? }` | `201 { maintenance, items[] }` |
| GET | `/api/maintenances/:id` | Yes | — | `200 { maintenance, items[], attachments[] }` |
| PATCH | `/api/maintenances/:id` | Yes | `{ notes?, status? }` | `200 { maintenance }` |
| PATCH | `/api/maintenances/:id/items/:itemId` | Yes | `{ actionTypeId, observations }` | `200 { item }` |
| POST | `/api/maintenances/:id/close` | Yes | `{ signatureData (base64) }` | `200 { maintenance, pdfPath }` |
| GET | `/api/maintenances/:id/pdf` | Yes | — | `200 application/pdf` |

### Attachments

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/attachments` | Yes | `multipart: file, scope, parentId` | `201 { attachment }` |
| GET | `/api/attachments/:id` | Yes | — | `200 file stream` |
| DELETE | `/api/attachments/:id` | Yes | — | `204` |

Scope encoding: `scope` field in multipart body is `"maintenance"` | `"maintenance_item"`, `parentId` is the UUID of the target.

### Templates

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/clients/:clientId/templates` | Yes | — | `200 { templates[] }` |
| POST | `/api/clients/:clientId/templates` | Yes | `{ name, description?, equipmentIds[] }` | `201 { template }` |
| PATCH | `/api/templates/:id` | Yes | `{ name?, description?, equipmentIds? }` | `200 { template }` |
| DELETE | `/api/templates/:id` | Yes | — | `204` |

### Notifications

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/notifications` | Yes | `?unreadOnly=true` | `200 { notifications[], unreadCount }` |
| PATCH | `/api/notifications/:id/read` | Yes | — | `200` |
| POST | `/api/notifications/read-all` | Yes | — | `200` |
| POST | `/api/push/subscribe` | Yes | `{ endpoint, keys: { p256dh, auth } }` | `201` |

## D. Authentication & Authorization

### JWT Strategy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | httpOnly + Secure + SameSite=Lax cookie | XSS-resistant; no localStorage token theft vector |
| Access token TTL | 15 minutes | Short window limits exposure if cookie is somehow leaked |
| Refresh strategy | Rotating refresh token in separate httpOnly cookie | 7-day sliding window; single-use with family tracking |
| Password hashing | bcrypt (cost 12) | Industry standard, resistant to GPU attacks |

### Middleware Chain

```
Request → cors → cookie-parser → authMiddleware → rateLimiter → route
```

**`authMiddleware`**: reads `accessToken` cookie → verifies JWT → attaches `req.user = { id, username }`. No role check (single role MVP). Returns 401 if missing/expired.

**Refresh flow**: on 401, frontend calls `POST /api/auth/refresh` (refresh cookie auto-sent) → new access token issued. If refresh token expired → redirect to login.

### No Admin Role

Single implicit role "técnico". Every authenticated request is authorized. If RBAC is needed later, add a `role` enum column to `users` — migration is additive.

## E. PDF Generation Pipeline

```
POST /maintenances/:id/close
         │
         ▼
┌─────────────────────┐
│  1. Validate & Save │
│  signature + status │
│  → CLOSED           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. Fetch Data      │
│  maintenance + items│
│  + attachments +    │
│  client + tech      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│  3. Render HTML     │────▶│  4. Puppeteer       │
│  (Handlebars/EJS)   │     │  page.pdf({A4})     │
│  - Header/logo      │     │  - Embed signature  │
│  - Items table      │     │  - Embed photos     │
│  - Photos grid      │     │  - Write PDF        │
│  - Signature block  │     │    to storage       │
└─────────────────────┘     └─────────┬───────────┘
                                       │
                                  FAIL?│
                                       ▼
                              ┌─────────────────────┐
                              │  5. PDFKit Fallback │
                              │  Simplified layout  │
                              │  (no HTML render)   │
                              │  Text + images only │
                              └─────────┬───────────┘
                                       │
                                       ▼
                              ┌─────────────────────┐
                              │  6. Update DB       │
                              │  pdfPath, pdfEngine │
                              │  Recalculate next   │
                              │  maintenance dates  │
                              └─────────────────────┘
```

**Puppeteer config**: `headless: 'shell'`, `--no-sandbox`, single shared browser instance (lazy-init, reused across requests). Memory limit: if Chromium RSS > 512MB, kill and respawn.

**PDFKit fallback trigger**: catch Puppeteer timeout (30s) or OOM. PDFKit template is simpler — no HTML/CSS, direct text positioning. Accept visual variance.

## F. Frontend Architecture

### Router Structure

```
/login                          → LoginPage
/                               → redirect to /clients
/clients                        → ClientListPage
/clients/:id                    → ClientDetailPage
  ├── ?tab=equipment            → EquipmentTab
  ├── ?tab=templates            → TemplatesTab
  ├── ?tab=history              → HistoryTab
  └── ?tab=maintenance          → (redirect to /maintenances/new?clientId=)
/maintenances/new?clientId=     → MaintenanceStartPage (select equipment/template)
/maintenances/:id               → MaintenanceFlowPage
  ├── step=items                → PerItemFormStep
  ├── step=report               → ReportReviewStep
  ├── step=signature            → SignatureStep
  └── step=done                 → CompletionStep
/templates                      → (accessed via client detail)
/notifications                  → NotificationsPage
```

### State Management (Pinia Stores)

| Store | Responsibility |
|-------|---------------|
| `useAuthStore` | login/logout, user state, token refresh interceptor |
| `useClientStore` | client list, CRUD, current client detail |
| `useEquipmentStore` | equipment per client, CRUD |
| `useMaintenanceDraftStore` | current draft: selected items, per-item form state, attachments queue |
| `useNotificationStore` | unread count, notification list, mark-read |
| `useActionTypeStore` | global action types list (cached, rarely changes) |

### Maintenance Flow Component Tree

```
MaintenanceFlowPage
├── StepIndicator (1-2-3-4)
├── PerItemFormStep
│   └── ItemCard (per equipment)
│       ├── ActionTypeSelect (+ inline create)
│       ├── ObservationsTextarea
│       └── PhotoUpload (multi, client-resize)
├── ReportReviewStep
│   ├── SummaryTable
│   ├── PhotoGallery (all photos, grouped)
│   └── GeneralPhotoUpload
├── SignatureStep
│   ├── SignaturePad (signature_pad lib, canvas)
│   ├── ClearButton
│   └── SubmitButton
└── CompletionStep
    ├── PdfStatus (generating / ready)
    └── BackToClientButton
```

### Signature Capture

- Library: `signature_pad` (lightweight, touch-friendly)
- Canvas: min 300x100px, responsive width (100% container)
- Export: `toDataURL('image/png')` → base64 string → POST to close endpoint
- Validation: check bounding box of drawn pixels ≥ 300x100px

### Photo Upload

- Client-side resize: `canvas.drawImage` to max 1920px long edge, JPEG quality 0.85
- Upload: `multipart/form-data`, one file per request (simpler retry)
- Limits: 10MB per file (pre-resize), 20 photos per maintenance
- Progress: per-file progress bar via `XMLHttpRequest.upload.onprogress`

### Notifications (Frontend)

- Bell icon in top bar with unread badge (from `useNotificationStore`)
- Drawer: slides from right on mobile, dropdown on desktop
- Push permission: request on first login after push setup
- Service worker: registered at `/sw.js` (root scope), handles `push` event → `self.registration.showNotification()`

## G. Notifications (Backend)

### Cron Job

```
node-cron schedule: "0 9 * * *" (daily at 09:00 server local time)
```

**Algorithm**:
1. Query clients where `next_maintenance_at` is in {today, today+1d, today+3d}
2. For each match, check `notifications` table for existing reminder with same `(clientId, window)` in last 24h
3. If no duplicate → insert `Notification` for all users + send web push to all subscribed devices

### Web Push

- VAPID keys: generated once via `web-push generate-vapid-keys`, stored in `.env`
- `web-push` npm package sends to each `PushSubscription` for subscribed users
- Service worker scope: `/` (root) — registered from `public/sw.js`
- Payload: `{ title, body, icon, data: { clientId } }`

### Timezone Decision

Server runs in UTC. Cron fires at 09:00 UTC. For MVP, this is acceptable. If the technician is in a different timezone, store a `timezone` field on `users` later and adjust cron query window.

## H. File & Attachment Storage

### Local Filesystem (MVP)

```
storage/
├── attachments/
│   └── {YYYY}/{MM}/
│       └── {uuid}.{ext}
├── pdfs/
│   └── {YYYY}/{MM}/
│       └── {maintenance-id}.pdf
└── signatures/
    └── {YYYY}/{MM}/
        └── {maintenance-id}.png
```

### Storage Abstraction

```typescript
interface StorageProvider {
  save(file: Buffer, path: string, contentType: string): Promise<string>;
  read(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

class LocalStorageProvider implements StorageProvider { ... }
// Future: class S3StorageProvider implements StorageProvider { ... }
```

**URL strategy**: `/api/attachments/:id` streams the file (auth-checked). No direct file URLs in MVP (security). The `getUrl()` method returns the API path, not the filesystem path.

**File naming**: `{uuid}.{ext}` where ext is derived from mime type. Prevents collisions and path traversal.

**Content-type**: stored in DB (`mime_type`), served from DB metadata (not file extension sniffing).

## I. Folder Structure

```
app-manten/                          ← monorepo root
├── pnpm-workspace.yaml
├── package.json                     ← root scripts (dev, build, db:migrate)
├── .env.example
├── .gitignore
├── apps/
│   ├── api/                         ← Express backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts              ← action type defaults
│   │   └── src/
│   │       ├── index.ts             ← Express app bootstrap
│   │       ├── config/
│   │       │   └── env.ts           ← zod-validated env
│   │       ├── middleware/
│   │       │   ├── auth.ts
│   │       │   ├── error-handler.ts
│   │       │   └── validate.ts      ← zod request validation
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── auth.controller.ts
│   │       │   │   ├── auth.service.ts
│   │       │   │   └── auth.schema.ts
│   │       │   ├── clients/
│   │       │   ├── equipment/
│   │       │   ├── action-types/
│   │       │   ├── maintenances/
│   │       │   ├── attachments/
│   │       │   ├── templates/
│   │       │   └── notifications/
│   │       ├── services/
│   │       │   ├── pdf/
│   │       │   │   ├── pdf.service.ts
│   │       │   │   ├── puppeteer.renderer.ts
│   │       │   │   ├── pdfkit.renderer.ts
│   │       │   │   └── templates/
│   │       │   │       └── maintenance-report.hbs
│   │       │   ├── storage/
│   │       │   │   ├── storage.provider.ts
│   │       │   │   └── local.provider.ts
│   │       │   └── notifications/
│   │       │       ├── cron.service.ts
│   │       │       └── push.service.ts
│   │       └── lib/
│   │           ├── prisma.ts        ← singleton client
│   │           └── puppeteer.ts     ← shared browser instance
│   └── web/                         ← Vue 3 frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       ├── public/
│       │   └── sw.js                ← service worker
│       └── src/
│           ├── main.ts
│           ├── App.vue
│           ├── router/
│           │   └── index.ts
│           ├── stores/
│           │   ├── auth.ts
│           │   ├── clients.ts
│           │   ├── equipment.ts
│           │   ├── maintenance-draft.ts
│           │   ├── notifications.ts
│           │   └── action-types.ts
│           ├── views/
│           │   ├── LoginPage.vue
│           │   ├── ClientListPage.vue
│           │   ├── ClientDetailPage.vue
│           │   ├── MaintenanceStartPage.vue
│           │   ├── MaintenanceFlowPage.vue
│           │   └── NotificationsPage.vue
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AppHeader.vue
│           │   │   ├── AppNav.vue
│           │   │   └── NotificationBell.vue
│           │   ├── clients/
│           │   │   ├── ClientCard.vue
│           │   │   └── ClientForm.vue
│           │   ├── equipment/
│           │   │   ├── EquipmentList.vue
│           │   │   └── EquipmentForm.vue
│           │   ├── maintenance/
│           │   │   ├── ItemCard.vue
│           │   │   ├── ActionTypeSelect.vue
│           │   │   ├── PhotoUpload.vue
│           │   │   ├── SignaturePad.vue
│           │   │   ├── StepIndicator.vue
│           │   │   └── PdfStatus.vue
│           │   ├── history/
│           │   │   └── MaintenanceHistoryList.vue
│           │   └── templates/
│           │       └── TemplateSelector.vue
│           ├── composables/
│           │   ├── usePhotoResize.ts
│           │   └── usePushSubscription.ts
│           ├── lib/
│           │   ├── api.ts            ← axios instance + interceptors
│           │   └── utils.ts
│           └── types/
│               └── index.ts          ← re-exports from @mantenti/types
├── packages/
│   └── types/                        ← shared TypeScript types
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── api.ts                ← request/response DTOs
│           └── models.ts             ← domain model types
└── storage/                          ← local file storage (gitignored)
    ├── attachments/
    ├── pdfs/
    └── signatures/
```

**Monorepo justification**: shared types prevent drift between API and frontend. pnpm workspaces are lightweight, no Turborepo needed for 2 apps + 1 package.

## J. Key Tradeoffs & Decisions

| # | Decision | Justification |
|---|----------|---------------|
| 1 | Express over Fastify | MVP familiarity, hiring pool, middleware ecosystem. Fastify is faster but Express is "good enough" for <100 concurrent users. |
| 2 | httpOnly cookie over localStorage | XSS-resistant. Slightly more complex CSRF handling (SameSite=Lax covers it for same-origin). |
| 3 | node-cron in-process over BullMQ/Redis | Zero infra for MVP. Single-process means no job dedup needed. Swap to BullMQ when horizontal scaling is needed. |
| 4 | Local filesystem over S3 from day one | MVP runs on single server. Storage abstraction makes migration trivial later. |
| 5 | Puppeteer + PDFKit dual engine | Puppeteer gives pixel-perfect HTML/CSS PDFs. PDFKit is the safety net. Accepting visual variance in fallback is the tradeoff. |
| 6 | Monorepo with shared types | Prevents API↔frontend type drift. Single `pnpm install`, single CI pipeline. |
| 7 | Polymorphic attachment via `scope` enum + `parent_id` | Simpler than separate join tables. Index on `(scope, parent_id)` makes queries fast. |
| 8 | Client-side photo resize | Reduces upload time on mobile networks. Server still enforces 10MB as safety net. |
| 9 | Signature as base64 in DB | Simplifies PDF generation (no file read needed). Base64 strings are ~1.3x larger but signatures are small (<50KB typical). |
| 10 | No offline/PWA | Adds massive complexity. Technicians are assumed to have connectivity at client sites. |

## K. Open Design Questions

- [ ] **Timezone**: Server cron at 09:00 UTC may not match technician's local 09:00. Acceptable for MVP if all users are in same timezone? (Flag for v2: per-user timezone + adjusted cron window.)
- [ ] **Signature min dimensions**: Spec says 300x100px canvas. Should we validate the actual drawn bounding box, or just the canvas size? (Decision: canvas size only — simpler, and a 300x100 canvas with a tiny dot is still "signed".)
- [ ] **Photo limit enforcement**: 20 photos per maintenance — is this across ALL items + general, or per-item? (Decision: global per maintenance, as spec implies.)
- [ ] **VAPID key generation**: One-time `web-push generate-vapid-keys` → `.env`. If `.env` is lost, old push subscriptions break. Acceptable for MVP? (Yes — regenerate + re-subscribe.)
- [ ] **Puppeteer memory**: On a 1GB VPS, Chromium may OOM. The PDFKit fallback handles this, but should we set a hard RSS limit (e.g., 512MB) and auto-kill? (Decision: yes, with auto-respawn.)
- [ ] **PDF storage**: Keep PDFs forever or set retention? (Decision: forever for MVP. Add retention policy in v2.)
- [ ] **Concurrent maintenance edits**: Two técnicos editing the same draft? (Decision: last-write-wins for MVP. Optimistic locking in v2 if needed.)

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Services (next-maintenance calc, auth, validation) | Vitest, mock Prisma |
| Integration | API endpoints, PDF generation | Supertest + test DB (docker-compose) |
| E2E | Full maintenance flow | Playwright (mobile viewport 375px) |

## Migration / Rollout

No migration required — greenfield project. Seed script creates default action types on first `prisma db push`.
