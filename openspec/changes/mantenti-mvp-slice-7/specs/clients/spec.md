# Client Management — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Ownership on create
The system SHALL set `createdById` to the authenticated user's id when any authenticated user creates a client.

#### Scenario: USER creates a client
- GIVEN an authenticated USER
- WHEN they POST `/api/clients`
- THEN the new client's `createdById` is the user's id

### Requirement: Ownership-based edit
The system SHALL allow a USER to edit only clients they created. ADMIN SHALL be able to edit any client.

#### Scenario: USER edits own client
- GIVEN a client with `createdById` matching the authenticated USER
- WHEN the USER PATCH `/api/clients/:id`
- THEN the update succeeds with 200 OK

#### Scenario: USER cannot edit another's client
- GIVEN a client with `createdById` belonging to another user
- WHEN the USER PATCH `/api/clients/:id`
- THEN the system returns 403 Forbidden

#### Scenario: ADMIN can edit any client
- GIVEN any existing client
- WHEN an ADMIN PATCH `/api/clients/:id`
- THEN the update succeeds with 200 OK

### Requirement: Delete restricted to ADMIN
The system SHALL restrict client deletion to ADMIN role.

#### Scenario: ADMIN deletes client
- GIVEN an existing client
- WHEN an ADMIN sends DELETE `/api/clients/:id`
- THEN the client is removed and the system returns 204 No Content

#### Scenario: USER cannot delete client
- GIVEN an existing client
- WHEN a USER sends DELETE `/api/clients/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot delete
- GIVEN no valid token
- WHEN any DELETE `/api/clients/:id` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend delete UI gating
The frontend MUST hide delete buttons for non-ADMIN users.

#### Scenario: Client list delete hidden for USER
- GIVEN a USER viewing the client list
- WHEN `ClientCard` renders
- THEN the delete menu item is not present

#### Scenario: Client detail delete hidden for USER
- GIVEN a USER on `ClientDetailPage`
- WHEN the page renders
- THEN the delete client button is not present

## MODIFIED Requirements

### Requirement: Client CRUD
The system SHALL support create, read, update, and delete operations for clients. Read access is shared across all authenticated users. Create and edit are scoped by ownership for USER role. Delete is ADMIN-only.
(Previously: all técnicos shared full CRUD with no restrictions)

#### Scenario: Create a client
- GIVEN an authenticated USER on the client list page
- WHEN they fill the client form and submit
- THEN the client appears in the shared card list
- AND `createdById` is set to the current user

#### Scenario: Edit a client
- GIVEN an existing client created by the current USER
- WHEN the USER updates the contact phone and saves
- THEN the card reflects the new phone for all users

#### Scenario: Delete a client
- GIVEN an existing client with no linked maintenances
- WHEN an ADMIN deletes the client
- THEN the client is removed and returns 204 No Content

#### Scenario: Prevent delete with history
- GIVEN an existing client with past maintenances
- WHEN an ADMIN attempts deletion
- THEN the system returns 409 Conflict and preserves the client
