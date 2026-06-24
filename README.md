# Mantenti

Maintenance management app for technicians and clients.

## Stack

- **Frontend**: Vue 3 + Vite + TypeScript + Pinia + Tailwind CSS
- **Backend**: Express 5 + TypeScript + Prisma (PostgreSQL)
- **Shared**: `@mantenti/types` workspace package

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- PostgreSQL

### Install

```bash
pnpm install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### Database

```bash
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
```

### Run

```bash
# API (port 3000)
pnpm --filter api dev

# Web (port 5173)
pnpm --filter web dev
```

## Push Notifications / VAPID

Push notifications use the [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) with VAPID authentication.

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This prints a public and private key pair. Add them to your `.env`:

```
VAPID_PUBLIC_KEY="<public key from output>"
VAPID_PRIVATE_KEY="<private key from output>"
VAPID_SUBJECT="mailto:admin@yourdomain.com"
```

- `VAPID_SUBJECT` must be a `mailto:` or `https:` URL identifying the push sender.
- The public key is also exposed to the frontend via `GET /api/push/vapid-key` and used by the service worker to subscribe.

### How It Works

1. The frontend calls `pushManager.subscribe()` with the VAPID public key.
2. The subscription (endpoint + keys) is stored in the `push_subscriptions` table.
3. The API sends push notifications via `web-push` when reminders fire (cron) or events occur.
4. The service worker (`sw.js`) receives `push` events and shows native notifications.
5. If a subscription expires (410/404), it is automatically cleaned up.

### Disabling Push

If `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are not set, push notifications are silently disabled. The app continues to work with in-app notifications only.
