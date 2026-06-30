# Templates — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Ownership on create
The system SHALL set `createdById` to the authenticated user's id when any authenticated user creates a template.

#### Scenario: USER creates template
- GIVEN an authenticated USER
- WHEN they POST `/api/templates`
- THEN the new template's `createdById` is the user's id

### Requirement: Ownership-based edit
The system SHALL allow a USER to edit only templates they created. ADMIN SHALL be able to edit any template.

#### Scenario: USER edits own template
- GIVEN a template with `createdById` matching the authenticated USER
- WHEN the USER PATCH `/api/templates/:id`
- THEN the update succeeds with 200 OK

#### Scenario: USER cannot edit another's template
- GIVEN a template with `createdById` belonging to another user
- WHEN the USER PATCH `/api/templates/:id`
- THEN the system returns 403 Forbidden

#### Scenario: ADMIN can edit any template
- GIVEN any existing template
- WHEN an ADMIN PATCH `/api/templates/:id`
- THEN the update succeeds with 200 OK

### Requirement: Delete restricted to ADMIN
The system SHALL restrict template deletion to ADMIN role.

#### Scenario: ADMIN deletes template
- GIVEN an existing template
- WHEN an ADMIN sends DELETE `/api/templates/:id`
- THEN the template is removed and the system returns 204 No Content

#### Scenario: USER cannot delete template
- GIVEN an existing template
- WHEN a USER sends DELETE `/api/templates/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot delete
- GIVEN no valid token
- WHEN any DELETE `/api/templates/:id` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend delete UI gating
The frontend MUST hide delete controls for templates from non-ADMIN users.

#### Scenario: Template delete hidden for USER
- GIVEN a USER viewing templates on a client page
- WHEN the template list renders
- THEN the delete control is not present

## MODIFIED Requirements

### Requirement: Template CRUD
The system SHALL allow creating, reading, updating, and deleting maintenance templates per client. Read and use access is shared. Create and edit are scoped by ownership for USER role. Delete is ADMIN-only.
(Previously: all técnicos shared full CRUD with no restrictions)

#### Scenario: Create a template
- GIVEN a client with 5 equipment items
- WHEN a USER selects 3 items and saves as template "Monthly Check"
- THEN the template appears in the template list for that client
- AND `createdById` is set to the current user

#### Scenario: Use template to start maintenance
- GIVEN a template "Monthly Check" with 3 equipment items
- WHEN any authenticated user starts maintenance and chooses the template
- THEN the draft is pre-populated with those 3 items

#### Scenario: Edit template
- GIVEN an existing template created by the current USER
- WHEN the USER adds a third item and saves
- THEN future uses of the template include the third item

#### Scenario: Delete template
- GIVEN an existing template
- WHEN an ADMIN deletes it
- THEN the template is removed
- AND past maintenances created from it remain intact
