# Notifications Specification

## Purpose

Alert técnicos of upcoming maintenance dates through an in-app notification center and web push, using a fixed reminder cadence.

## Requirements

### Requirement: In-app notification center

The system SHALL provide an in-app bell icon with an unread badge that opens a notification list.

#### Scenario: Unread notification badge

- GIVEN 3 unread notifications for a técnico
- WHEN any page renders the top bar
- THEN the bell shows a badge with count "3"

#### Scenario: Mark as read

- GIVEN the notification drawer is open with 2 unread items
- WHEN a técnico taps an item
- THEN it is marked read and the badge decrements

### Requirement: Upcoming maintenance reminders

The system SHALL generate reminders for upcoming maintenance at 3 days before, 1 day before, and day-of at 09:00 local time.

#### Scenario: Three-day reminder

- GIVEN a client with next_maintenance_at on 2026-06-21
- WHEN the daily job runs on 2026-06-18 at 09:00
- THEN a notification is created: "Acme Corp maintenance in 3 days"

#### Scenario: Day-of reminder

- GIVEN a client with next_maintenance_at on 2026-06-21
- WHEN the daily job runs on 2026-06-21 at 09:00
- THEN a notification is created: "Acme Corp maintenance today"

#### Scenario: No duplicate reminders

- GIVEN a reminder was already sent for the 3-day window
- WHEN the job runs again the same day
- THEN no duplicate notification is created

### Requirement: Web push notifications

The system MAY support web push notifications for técnicos who grant browser permission.

#### Scenario: Subscribe to push

- GIVEN a técnico grants push permission
- WHEN a new reminder is generated
- THEN a push notification is delivered to the browser

#### Scenario: Push permission denied

- GIVEN a técnico denies push permission
- WHEN a reminder is generated
- THEN only the in-app notification is created
