# Software — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Ownership on create
The system SHALL set `createdById` to the authenticated user's id when any authenticated user creates a software record.

#### Scenario: USER creates software
- GIVEN an authenticated USER
- WHEN they POST `/api/software`
- THEN the new software record's `createdById` is the user's id

### Requirement: Ownership-based edit
The system SHALL allow a USER to edit only software records they created. ADMIN SHALL be able to edit any software record.

#### Scenario: USER edits own software
- GIVEN a software record with `createdById` matching the authenticated USER
- WHEN the USER PATCH `/api/software/:id`
- THEN the update succeeds with 200 OK

#### Scenario: USER cannot edit another's software
- GIVEN a software record with `createdById` belonging to another user
- WHEN the USER PATCH `/api/software/:id`
- THEN the system returns 403 Forbidden

#### Scenario: ADMIN can edit any software
- GIVEN any existing software record
- WHEN an ADMIN PATCH `/api/software/:id`
- THEN the update succeeds with 200 OK

### Requirement: Delete restricted to ADMIN
The system SHALL restrict software deletion to ADMIN role.

#### Scenario: ADMIN deletes software
- GIVEN an existing software record
- WHEN an ADMIN sends DELETE `/api/software/:id`
- THEN the software is removed and the system returns 204 No Content

#### Scenario: USER cannot delete software
- GIVEN an existing software record
- WHEN a USER sends DELETE `/api/software/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot delete
- GIVEN no valid token
- WHEN any DELETE `/api/software/:id` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend delete UI gating
The frontend MUST hide delete buttons for software from non-ADMIN users.

#### Scenario: Software delete hidden for USER
- GIVEN a USER on `ClientDetailPage`
- WHEN the software section renders
- THEN the delete software button is not present

## MODIFIED Requirements

### Requirement: Software CRUD
The system SHALL support create, read, update, and delete operations for software linked to a client. Read access is shared. Create and edit are scoped by ownership for USER role. Delete is ADMIN-only.
(Previously: all técnicos shared full CRUD with no restrictions)

#### Scenario: Create software
- GIVEN an authenticated USER
- WHEN they create a software record with version and license
- THEN the record appears under the client's detail page
- AND `createdById` is set to the current user

#### Scenario: Edit software
- GIVEN an existing software record created by the current USER
- WHEN the USER updates the license key
- THEN the change is persisted

#### Scenario: Delete software
- GIVEN an existing software record
- WHEN an ADMIN deletes it
- THEN the record is removed
