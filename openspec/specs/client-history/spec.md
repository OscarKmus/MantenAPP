# Capability: Client History

## Purpose

Provide technicians with a read-only list of closed maintenance records for a specific client, enabling navigation to individual maintenance detail pages.

## Requirements

### Requirement: CLOSED-only Filtering

The system SHALL filter maintenance records to include only those with status `CLOSED`. Maintenances with status `DRAFT` or `IN_PROGRESS` MUST NOT appear in the history list.

#### Scenario: User requests client history

WHEN a technician opens the Historial tab for a client
THEN the system SHALL fetch maintenance records with `status=CLOSED`
AND the response SHALL exclude any non-CLOSED maintenances.

#### Scenario: API receives status filter

WHEN the backend receives `GET /api/clients/:id/maintenances?status=CLOSED`
THEN the Prisma query SHALL include `status: "CLOSED"` in the where clause.

### Requirement: Navigate to Detail

Each maintenance row in the history list SHALL be clickable and navigate the user to the maintenance detail page at `/maintenances/:id`. Inline expansion of details MUST NOT be used.

#### Scenario: User clicks a maintenance row

WHEN a technician clicks a row in the history list
THEN the browser SHALL navigate to `/maintenances/:id` where `id` is the maintenance identifier.

#### Scenario: Row interaction

WHEN the history list renders each maintenance item
THEN the item SHALL be a button or link with appropriate focus styles.

### Requirement: Pagination

The history list SHALL support pagination with configurable page size. The default page size SHALL be 20 items.

#### Scenario: User navigates pages

WHEN the technician clicks next/previous page controls
THEN the system SHALL fetch the corresponding page of CLOSED maintenances.

#### Scenario: Total count

WHEN the history list loads
THEN the response SHALL include `total` count for pagination controls.

### Requirement: Loading State

While fetching history, the system SHALL display a loading skeleton or indicator.

#### Scenario: Initial load

WHEN the history list is fetching data
THEN a loading skeleton SHALL be displayed.

#### Scenario: Page change

WHEN the user navigates to a different page
THEN the list SHALL show a loading state until the new page loads.

### Requirement: Empty State

If a client has no closed maintenances, the system SHALL display an empty state message.

#### Scenario: No closed maintenances

WHEN the client has zero CLOSED maintenances
THEN the history list SHALL show a message indicating no closed maintenances are available.

### Requirement: Accessibility

The history list SHALL be accessible to screen readers and keyboard navigation.

#### Scenario: Semantic markup

WHEN the history list renders
THEN it SHALL use a `<ul>` element with `role="list"` and each item as `<li role="listitem">`.

#### Scenario: Keyboard navigation

WHEN the user navigates with keyboard
THEN focus indicators SHALL be visible using `focus-visible` styles.

#### Scenario: Reduced motion

WHEN the user prefers reduced motion
THEN any transitions SHALL be disabled.