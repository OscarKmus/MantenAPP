# Notifications — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Role-agnostic notification access
Notification visibility SHALL remain scoped to the authenticated user only. Role SHALL NOT expand or restrict notification access beyond ownership.

#### Scenario: USER sees own notifications
- GIVEN an authenticated USER with 3 unread notifications
- WHEN they GET `/api/notifications`
- THEN only their own notifications are returned
- AND the unread count is accurate

#### Scenario: ADMIN sees own notifications
- GIVEN an authenticated ADMIN with 2 unread notifications
- WHEN they GET `/api/notifications`
- THEN only their own notifications are returned

#### Scenario: Mark read is user-scoped
- GIVEN a USER and an ADMIN each have notifications
- WHEN the USER marks all notifications as read
- THEN only the USER's notifications are affected

## MODIFIED Requirements

### Requirement: Notification CRUD
The system SHALL provide endpoints to list, mark read, and mark all read for notifications. Access is strictly limited to the authenticated user's own notifications regardless of role.
(Previously: implicitly per-user; now explicitly confirmed as role-agnostic)

#### Scenario: List notifications
- GIVEN a user requests `GET /api/notifications`
- THEN the system returns a paginated list of notifications for the authenticated user
- AND the response includes `unreadCount`

#### Scenario: Mark single notification read
- GIVEN a user sends `PATCH /api/notifications/:id/read`
- THEN the system sets `isRead = true` for that notification if it belongs to the user
- AND returns the updated notification

#### Scenario: Mark all notifications read
- GIVEN a user sends `POST /api/notifications/read-all`
- THEN the system sets `isRead = true` for all unread notifications of that user
- AND returns the count of updated notifications
