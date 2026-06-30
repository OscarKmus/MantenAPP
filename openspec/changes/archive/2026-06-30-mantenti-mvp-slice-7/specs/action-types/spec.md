# Action Types — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Catalog write restricted to ADMIN
The system SHALL restrict creation, update, and deletion of action types to ADMIN. USER role SHALL have read-only access.

#### Scenario: ADMIN creates action type
- GIVEN an authenticated ADMIN
- WHEN they POST `/api/action-types`
- THEN the action type is created with 201 Created

#### Scenario: USER cannot create action type
- GIVEN an authenticated USER
- WHEN they POST `/api/action-types`
- THEN the system returns 403 Forbidden

#### Scenario: USER cannot update action type
- GIVEN an existing action type
- WHEN a USER sends PUT/PATCH `/api/action-types/:id`
- THEN the system returns 403 Forbidden

#### Scenario: USER cannot delete action type
- GIVEN an existing action type
- WHEN a USER sends DELETE `/api/action-types/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot modify catalog
- GIVEN no valid token
- WHEN any write operation on `/api/action-types` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend catalog UI gating
The frontend MUST hide create, edit, and delete controls for action types from non-ADMIN users.

#### Scenario: Inline action type creation hidden for USER
- GIVEN a USER in the maintenance form action type dropdown
- WHEN the dropdown renders
- THEN the "+ Nuevo tipo" option is not present

## MODIFIED Requirements

### Requirement: Dynamic action type CRUD
The system SHALL allow creating, listing, and updating action types. Read access is shared across all authenticated users. Write operations are ADMIN-only.
(Previously: all técnicos could create, update, and delete action types)

#### Scenario: Create a new action type
- GIVEN an authenticated ADMIN
- WHEN they create an action type named "Migración"
- THEN the type is saved and immediately selectable

#### Scenario: List existing types
- GIVEN the maintenance form
- WHEN the action type dropdown opens
- THEN it shows all global types sorted alphabetically

#### Scenario: Prevent deletion of used type
- GIVEN an action type referenced by at least one maintenance item
- WHEN an ADMIN attempts to delete it
- THEN the system returns 409 Conflict and preserves the type
