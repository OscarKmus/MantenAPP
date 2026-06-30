# Equipment Management — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Ownership on create
The system SHALL set `createdById` to the authenticated user's id when any authenticated user creates equipment.

#### Scenario: USER creates equipment
- GIVEN an authenticated USER
- WHEN they POST `/api/equipment` for a client
- THEN the new equipment's `createdById` is the user's id

### Requirement: Ownership-based edit
The system SHALL allow a USER to edit only equipment they created. ADMIN SHALL be able to edit any equipment.

#### Scenario: USER edits own equipment
- GIVEN equipment with `createdById` matching the authenticated USER
- WHEN the USER PATCH `/api/equipment/:id`
- THEN the update succeeds with 200 OK

#### Scenario: USER cannot edit another's equipment
- GIVEN equipment with `createdById` belonging to another user
- WHEN the USER PATCH `/api/equipment/:id`
- THEN the system returns 403 Forbidden

#### Scenario: ADMIN can edit any equipment
- GIVEN any existing equipment
- WHEN an ADMIN PATCH `/api/equipment/:id`
- THEN the update succeeds with 200 OK

### Requirement: Delete restricted to ADMIN
The system SHALL restrict equipment deletion to ADMIN role.

#### Scenario: ADMIN deletes equipment
- GIVEN existing equipment with no maintenance history
- WHEN an ADMIN sends DELETE `/api/equipment/:id`
- THEN the equipment is removed and the system returns 204 No Content

#### Scenario: USER cannot delete equipment
- GIVEN existing equipment
- WHEN a USER sends DELETE `/api/equipment/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot delete
- GIVEN no valid token
- WHEN any DELETE `/api/equipment/:id` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend delete UI gating
The frontend MUST hide delete buttons for non-ADMIN users.

#### Scenario: Equipment list delete hidden for USER
- GIVEN a USER viewing equipment on `ClientDetailPage`
- WHEN `EquipmentList` renders
- THEN the delete button is not present

## MODIFIED Requirements

### Requirement: Equipment CRUD per client
The system SHALL allow CRUD operations for equipment linked to a specific client. Create and edit are scoped by ownership for USER role. Delete is ADMIN-only.
(Previously: all técnicos shared full CRUD with no restrictions)

#### Scenario: Add equipment to a client
- GIVEN a client "Acme Corp"
- WHEN a USER adds a workstation with IP 192.168.1.10
- THEN the equipment appears under Acme Corp’s detail page
- AND `createdById` is set to the current user

#### Scenario: Edit equipment
- GIVEN existing equipment created by the current USER
- WHEN a USER updates the assigned user to "Maria Gomez"
- THEN the change is persisted and visible immediately

#### Scenario: Delete equipment
- GIVEN equipment with no maintenance history
- WHEN an ADMIN deletes it
- THEN the equipment is removed

#### Scenario: Prevent delete with maintenance history
- GIVEN equipment referenced in at least one maintenance record
- WHEN an ADMIN attempts deletion
- THEN the system returns 409 Conflict and prevents removal
