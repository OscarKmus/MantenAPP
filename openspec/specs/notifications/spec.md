# Capability: Notifications

## Purpose

Deliver timely reminders to technicians about upcoming maintenance events via in-app notifications and web push, with a daily cron job generating reminders at 09:00 UTC.

## Requirements

### Requirement: Notification CRUD

The system SHALL provide endpoints to list, mark read, and mark all read for notifications.

#### Scenario: List notifications

WHEN a user requests `GET /api/notifications`
THEN the system SHALL return a paginated list of notifications for the authenticated user.
AND the response SHALL include `unreadCount`.

#### Scenario: Filter unread only

WHEN the query includes `unreadOnly=true`
THEN the system SHALL return only notifications where `isRead = false`.

#### Scenario: Mark single notification read

WHEN a user sends `PATCH /api/notifications/:id/read`
THEN the system SHALL set `isRead = true` for that notification.
AND the system SHALL return the updated notification.

#### Scenario: Mark all notifications read

WHEN a user sends `POST /api/notifications/read-all`
THEN the system SHALL set `isRead = true` for all unread notifications of that user.
AND the system SHALL return the count of updated notifications.

### Requirement: Web Push Subscription

The system SHALL allow users to subscribe and unsubscribe from web push notifications.

#### Scenario: Subscribe to push

WHEN a user sends `POST /api/push/subscribe` with a valid subscription object
THEN the system SHALL store the subscription in the `PushSubscription` table.
AND the system SHALL return 201 Created.
AND duplicate endpoints SHALL return 409 Conflict.

#### Scenario: Unsubscribe from push

WHEN a user sends `POST /api/push/unsubscribe` with an endpoint
THEN the system SHALL delete the matching subscription.
AND the system SHALL return 204 No Content.

### Requirement: Daily Cron Reminders

The system SHALL run a daily cron job at 09:00 UTC that generates reminder notifications for upcoming maintenances.

#### Scenario: Cron triggers at 09:00 UTC

WHEN the cron job fires at 09:00 UTC
THEN the system SHALL query clients where `nextMaintenanceAt` is today, tomorrow, or three days from now.

#### Scenario: Dedup within 24 hours

WHEN a reminder would be generated for a client+window combination
THEN the system SHALL check if a notification with matching body exists for that user within the last 24 hours.
AND if a duplicate exists, the system SHALL skip creation.

#### Scenario: Notification creation

WHEN a reminder is generated
THEN the system SHALL create a `Notification` for each user associated with the client.
AND the notification body SHALL include the client name and window label (e.g., "in 3 days", "tomorrow", "today").

### Requirement: Web Push Delivery

The system SHALL deliver web push notifications via the `web-push` npm package using VAPID keys.

#### Scenario: Push sent after cron creation

WHEN a notification is created by the cron job
THEN the system SHALL attempt to send a web push to all subscriptions for the associated users.

#### Scenario: Push failure handling

WHEN a push delivery fails (e.g., expired subscription)
THEN the system SHALL log the error and continue with other subscriptions.
AND the system SHALL NOT delete the subscription on failure.

### Requirement: In-App Notification Bell

The frontend SHALL display a notification bell icon in the application header with an unread count badge.

#### Scenario: Bell renders

WHEN the user is authenticated
THEN a bell icon SHALL appear in the AppHeader.
AND if there are unread notifications, a badge SHALL display the count.

#### Scenario: Badge accessibility

WHEN the badge is displayed
THEN it SHALL have `aria-label` describing the count (e.g., "5 notificaciones no leídas").
AND it SHALL have `role="status"`.

#### Scenario: Bell click opens drawer

WHEN the user clicks the bell icon
THEN a slide-in drawer SHALL open showing recent notifications.
AND the drawer SHALL allow marking individual notifications as read.

#### Scenario: Polling interval

WHEN the bell is visible
THEN the system SHALL poll unread count every 60 seconds.
AND polling SHALL stop when the component is unmounted.

### Requirement: Notifications Page

The system SHALL provide a full notifications page at `/notifications`.

#### Scenario: Route exists

WHEN a user navigates to `/notifications`
THEN the system SHALL display the `NotificationsPage` component.
AND the route SHALL require authentication.

#### Scenario: Page actions

WHEN the notifications page is displayed
THEN the user SHALL be able to mark individual notifications as read.
AND the user SHALL be able to mark all notifications as read.

### Requirement: Service Worker Push Handling

The frontend SHALL include a service worker that handles push events.

#### Scenario: Push event received

WHEN the service worker receives a push event
THEN it SHALL display a notification via `self.registration.showNotification()`.

#### Scenario: Notification click

WHEN the user clicks a push notification
THEN the service worker SHALL open `/clients` in a new window.

#### Scenario: Service worker registration

WHEN the application loads after authentication
THEN the service worker SHALL be registered at `/sw.js`.

### Requirement: Accessibility

All notification components SHALL be accessible.

#### Scenario: Reduced motion

WHEN the user prefers reduced motion
THEN drawer transitions SHALL be disabled (duration 0).

#### Scenario: Focus styles

WHEN the user navigates with keyboard
THEN interactive elements SHALL show `focus-visible` ring styles.

### Requirement: Notification Preference Management

The system SHALL allow users to manage per-channel notification preferences (INAPP, PUSH, EMAIL).

#### Scenario: Get preferences

WHEN a user sends `GET /api/notifications/preferences`
THEN the system SHALL return an array of `NotificationPreference` objects for that user.
AND each object SHALL include `channel` and `enabled` fields.

#### Scenario: Update preference

WHEN a user sends `PATCH /api/notifications/preferences` with `{ channel, enabled }`
THEN the system SHALL upsert the preference for that user+channel combination.
AND the response SHALL include the updated preference.

#### Scenario: Default behavior

WHEN a user has no stored preferences
THEN `getForUser` SHALL return an empty array.
AND the system SHALL treat all channels as enabled by default.

### Requirement: Notification Body Length Validation

The system SHALL enforce maximum lengths on notification title and body fields.

#### Scenario: Body too long

WHEN a notification is created with `body.length > 500`
THEN the system SHALL reject the request with a 400 error.

#### Scenario: Title too long

WHEN a notification is created with `title.length > 200`
THEN the system SHALL reject the request with a 400 error.

### Requirement: Batched markAllRead

The system SHALL mark all unread notifications as read in batches to avoid long-running table locks.

#### Scenario: Large unread set

WHEN a user has more than 1000 unread notifications
THEN `markAllRead` SHALL process them in chunks of 1000 using findMany + updateMany.
AND the system SHALL safeguard with a maximum of 100 iterations.

#### Scenario: Return count

WHEN `markAllRead` completes
THEN it SHALL return the total number of notifications updated.

### Requirement: Structured Logging

The notification services SHALL use structured logging via `pino` instead of `console.log/error/warn`.

#### Scenario: Production logging

WHEN `NODE_ENV` is `"production"`
THEN log output SHALL be JSON format with structured fields.

#### Scenario: Development logging

WHEN `NODE_ENV` is not `"production"`
THEN log output SHALL use `pino-pretty` for human-readable formatting.

### Requirement: Push Subscription Management

The system SHALL allow users to list and remove their push subscriptions.

#### Scenario: List subscriptions

WHEN a user sends `GET /api/push/subscriptions`
THEN the system SHALL return an array of the user's subscriptions with `id`, `endpoint`, and `createdAt`.
AND the response SHALL NOT include sensitive key material (`p256dh`, `auth`).

#### Scenario: Remove subscription

WHEN a user sends `DELETE /api/push/subscriptions/:endpoint` (URL-encoded)
THEN the system SHALL delete the matching subscription for that user.
AND the system SHALL return 204 No Content.
AND if the subscription does not exist, the system SHALL return 404.