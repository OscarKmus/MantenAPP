# Proposal: mantenti-mvp

## Intent

Responsive web app for IT technicians to manage clients, equipment, and maintenance workflows — from equipment selection through signed PDF reports.

## Scope

### In Scope
- JWT login, single role "técnico", no admin
- Client CRUD (cards) with location, contact, next-maintenance
- Equipment CRUD per client (IP, MAC, serial, user, status)
- Maintenance flow: select equipment → log actions → report → signature → signed PDF
- Manual mode + Template mode (pre-saved equipment sets)
- Dynamic action types (técnico-created, pre-seeded defaults)
- Client history with linked PDFs
- Server-side PDF with signature + photos
- Polymorphic attachments (per-item + per-maintenance)
- In-app notifications + web push
- Hybrid next-maintenance (frequency + agreed + override)
- Mobile-first responsive UI

### Out of Scope
- Forgot-password (manual DB reset for MVP)
- Multi-tenant, offline/PWA, native mobile, email notifications
- Admin panel, billing, multi-language

## Capabilities

### New
- `user-auth`: JWT login, técnico accounts
- `client-management`: CRUD, cards, next-maintenance model
- `equipment-management`: CRUD per client
- `action-types`: dynamic CRUD, inline creation
- `maintenance-workflow`: selection, logging, templates, signature, PDF
- `pdf-generation`: server-side, signature, photos
- `maintenance-attachments`: polymorphic, local storage
- `client-history`: list with linked PDFs
- `notifications`: in-app + web push
- `templates`: pre-saved equipment sets

### Modified
None (greenfield).

## Approach

- **Frontend**: Vue 3 + Vite + Tailwind, Pinia, `signature_pad`
- **Backend**: Node.js + Express + Prisma + PostgreSQL, PNPM monorepo
- **PDF**: Puppeteer rendering HTML templates
- **Storage**: Local `uploads/`, S3 later
- **Auth**: bcrypt + short-lived JWT

## Affected Areas

| Area | Impact |
|------|--------|
| `packages/frontend/` | New — Vue app, components, router, stores |
| `packages/backend/` | New — Node API, services, Prisma schema |
| `packages/backend/src/pdf/` | New — Puppeteer PDF rendering |
| `prisma/` | New — 9 tables (users→templates) |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Puppeteer memory/CPU | Med | Fallback to PDFKit |
| Photo uploads slow on mobile | Med | Client-side resize |
| Web push needs HTTPS | Low | HTTPS from day one |

## Rollback Plan

Greenfield — discard branch if stalled. Revert deployment tag; PostgreSQL persists independently.

## Dependencies

- Node.js ≥ 20, PNPM, PostgreSQL ≥ 15, Puppeteer, VAPID keys, `signature_pad`

## Success Criteria

- [ ] Login + client cards on mobile and desktop
- [ ] Full flow: select → log → sign → PDF
- [ ] PDF includes details, actions, photos, signature
- [ ] Templates skip manual equipment selection
- [ ] Client history with downloadable PDFs
- [ ] Web push for upcoming maintenance
- [ ] Usable on 375px screen
- [ ] One codebase for mobile + desktop
