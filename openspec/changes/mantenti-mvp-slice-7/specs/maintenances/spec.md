# Maintenance Workflow — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Ownership on create
The system SHALL set `technicianId` to the authenticated user's id when any authenticated user creates a maintenance.

#### Scenario: USER creates maintenance
- GIVEN an authenticated USER
- WHEN they POST `/api/maintenances`
- THEN the new maintenance's `technicianId` is the user's id

### Requirement: Ownership-based edit
The system SHALL allow a USER to edit only maintenances where they are the assigned technician. ADMIN SHALL be able to edit any maintenance.

#### Scenario: USER edits own maintenance
- GIVEN a maintenance with `technicianId` matching the authenticated USER
- WHEN the USER PATCH `/api/maintenances/:id`
- THEN the update succeeds with 200 OK

#### Scenario: USER cannot edit another's maintenance
- GIVEN a maintenance with `technicianId` belonging to another user
- WHEN the USER PATCH `/api/maintenances/:id`
- THEN the system returns 403 Forbidden

#### Scenario: ADMIN can edit any maintenance
- GIVEN any existing maintenance
- WHEN an ADMIN PATCH `/api/maintenances/:id`
- THEN the update succeeds with 200 OK

### Requirement: Close maintenance scoped to owner or ADMIN
The system SHALL allow a USER to close only maintenances where they are the assigned technician. ADMIN SHALL be able to close any maintenance.

#### Scenario: USER closes own maintenance
- GIVEN a maintenance with `technicianId` matching the authenticated USER and all required fields completed
- WHEN the USER POST `/api/maintenances/:id/close`
- THEN the maintenance transitions to `CLOSED`

#### Scenario: USER cannot close another's maintenance
- GIVEN a maintenance with `technicianId` belonging to another user
- WHEN the USER POST `/api/maintenances/:id/close`
- THEN the system returns 403 Forbidden

### Requirement: Delete maintenance item restricted to ADMIN
The system SHALL restrict deletion of maintenance items to ADMIN role.

#### Scenario: ADMIN deletes maintenance item
- GIVEN an existing maintenance item
- WHEN an ADMIN sends DELETE `/api/maintenances/:id/items/:itemId`
- THEN the item is removed and the system returns 204 No Content

#### Scenario: USER cannot delete maintenance item
- GIVEN an existing maintenance item
- WHEN a USER sends DELETE `/api/maintenances/:id/items/:itemId`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot delete item
- GIVEN no valid token
- WHEN any DELETE `/api/maintenances/:id/items/:itemId` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend delete UI gating
The frontend MUST hide remove-item and remove-attachment buttons for non-ADMIN users.

#### Scenario: Remove item hidden for USER
- GIVEN a USER on `MaintenanceFlowPage`
- WHEN the maintenance items render
- THEN the remove item button is not present

#### Scenario: Remove attachment hidden for USER
- GIVEN a USER on `MaintenanceFlowPage`
- WHEN attachments render
- THEN the remove attachment button is not present

## MODIFIED Requirements

### Requirement: Maintenance status lifecycle
The system SHALL track maintenance status as: Draft → In Progress → Closed.
(Previously: any authenticated user could transition any maintenance)

#### Scenario: Close maintenance
- GIVEN a maintenance in `IN_PROGRESS` with all required fields
- WHEN the assigned technician or an ADMIN confirms closure with signature
- THEN status becomes `CLOSED`
- AND a PDF is generated asynchronously

#### Scenario: Reopen not allowed
- GIVEN a `CLOSED` maintenance
- WHEN any user attempts to edit it
- THEN the system returns 403 Forbidden and prevents edits
