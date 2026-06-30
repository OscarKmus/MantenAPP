# Users Module Specification

## Purpose
Provide ADMIN users with full user management capabilities, including creation, role changes, and hard deletion, while enforcing last-admin protection.

## Requirements

### Requirement: List users
The system SHALL provide an endpoint to list all users, restricted to ADMIN.

#### Scenario: ADMIN lists users
- GIVEN an authenticated ADMIN
- WHEN they GET `/api/users`
- THEN the system returns all users with `id`, `username`, `fullName`, and `role`

#### Scenario: USER cannot list users
- GIVEN an authenticated USER
- WHEN they GET `/api/users`
- THEN the system returns 403 Forbidden

### Requirement: Create user
The system SHALL allow ADMIN to create new users.

#### Scenario: ADMIN creates user
- GIVEN an authenticated ADMIN
- WHEN they POST `/api/users` with `username`, `password`, `fullName`, and `role`
- THEN the user is created with a hashed password
- AND the response returns the created user without the password hash

#### Scenario: USER cannot create user
- GIVEN an authenticated USER
- WHEN they POST `/api/users`
- THEN the system returns 403 Forbidden

#### Scenario: Duplicate username
- GIVEN an existing user with username "juan"
- WHEN an ADMIN attempts to create another user with username "juan"
- THEN the system returns 409 Conflict

### Requirement: Change user role
The system SHALL allow ADMIN to change a user's role, with last-admin and self-demotion guards.

#### Scenario: ADMIN promotes a USER
- GIVEN an existing USER and an authenticated ADMIN
- WHEN the ADMIN PATCH `/api/users/:id/role` with `{ role: "ADMIN" }`
- THEN the user's role is updated to `ADMIN`

#### Scenario: Self-demotion blocked
- GIVEN an authenticated ADMIN
- WHEN they attempt to PATCH their own role to `USER`
- THEN the system returns 403 Forbidden

#### Scenario: Last-admin demotion blocked
- GIVEN only one ADMIN exists in the system
- WHEN any attempt is made to demote that ADMIN to USER
- THEN the system returns 403 Forbidden

### Requirement: Delete user
The system SHALL allow ADMIN to delete users, with last-admin protection. Deletion is hard delete.

#### Scenario: ADMIN deletes a USER
- GIVEN an existing USER
- WHEN an ADMIN sends DELETE `/api/users/:id`
- THEN the user is permanently removed
- AND associated `createdById` and `technicianId` references are set to NULL

#### Scenario: Last-admin deletion blocked
- GIVEN only one ADMIN exists in the system
- WHEN any attempt is made to delete that ADMIN
- THEN the system returns 403 Forbidden

#### Scenario: USER cannot delete any user
- GIVEN an authenticated USER
- WHEN they send DELETE `/api/users/:id`
- THEN the system returns 403 Forbidden

### Requirement: Get user by id
The system SHALL allow retrieving a single user by id, accessible to ADMIN or the user themselves.

#### Scenario: ADMIN gets any user
- GIVEN an existing user
- WHEN an ADMIN GET `/api/users/:id`
- THEN the user details are returned

#### Scenario: User gets self
- GIVEN an authenticated USER with id matching the requested id
- WHEN they GET `/api/users/:id`
- THEN their own details are returned

#### Scenario: USER cannot get another user
- GIVEN an authenticated USER
- WHEN they GET `/api/users/:id` for a different user
- THEN the system returns 403 Forbidden

### Requirement: Cascade on user deletion
When a user is hard-deleted, the system SHALL preserve their created records by setting `createdById` and `technicianId` to NULL.

#### Scenario: Delete user preserves clients
- GIVEN a user who created clients
- WHEN that user is deleted
- THEN the clients remain in the database
- AND their `createdById` becomes NULL

#### Scenario: Delete user preserves maintenances
- GIVEN a user assigned as technician to maintenances
- WHEN that user is deleted
- THEN the maintenances remain in the database
- AND their `technicianId` becomes NULL

### Requirement: Admin user management UI
The frontend SHALL provide an admin-only user management view.

#### Scenario: Admin nav item visible
- GIVEN an authenticated ADMIN
- WHEN the navigation renders
- THEN an "Admin" nav item linking to `/admin/users` is visible

#### Scenario: Admin nav item hidden for USER
- GIVEN an authenticated USER
- WHEN the navigation renders
- THEN the "Admin" nav item is not rendered

#### Scenario: Route guard redirects USER
- GIVEN an authenticated USER
- WHEN they navigate to `/admin/users`
- THEN they are redirected to `/clients`

#### Scenario: Admin users page functions
- GIVEN an authenticated ADMIN on `/admin/users`
- WHEN the page renders
- THEN the admin sees a list of all users
- AND can create new users
- AND can change roles
- AND can delete users (with confirmation)
