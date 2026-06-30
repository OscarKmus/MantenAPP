# Authentication — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Role in JWT access token
The access token payload MUST include `role` (`USER` or `ADMIN`).

#### Scenario: Login returns role
- GIVEN a registered user with role `ADMIN`
- WHEN they authenticate via `POST /auth/login`
- THEN the access token payload contains `role: "ADMIN"`
- AND `GET /auth/me` returns the user object including `role`

#### Scenario: Token TTL demotion window
- GIVEN an ADMIN is demoted to USER
- WHEN their existing access token is used within 15 minutes
- THEN the token is still accepted with the old `ADMIN` role
- AND after refresh, the new token contains `role: "USER"`

### Requirement: Refresh token omits role
The refresh token MUST NOT include `role`. On refresh, the system SHALL re-read the user's current role from the database.

#### Scenario: Refresh re-reads role from DB
- GIVEN a valid refresh token
- WHEN the user calls `POST /auth/refresh`
- THEN the system queries the database for the user's current role
- AND issues a new access token with the fresh role

### Requirement: Role migration
The system MUST migrate existing users to the RBAC schema idempotently.

#### Scenario: Migration applies defaults
- GIVEN existing users in the database
- WHEN the migration runs
- THEN a `role` column is added with default `USER`
- AND the user with username `admin` is updated to `ADMIN`

#### Scenario: Backfill createdById
- GIVEN existing clients, equipment, software, templates, or attachments without `createdById`
- WHEN the migration runs
- THEN `createdById` is set to the admin user's id for all existing records

### Requirement: Admin-only user creation
User creation SHALL be restricted to ADMIN via the `/api/users` module. No public self-registration endpoint SHALL exist.

#### Scenario: Public register absent
- GIVEN an unauthenticated client
- WHEN they send `POST /auth/register`
- THEN the system returns 404 Not Found

## MODIFIED Requirements

### Requirement: Login with username and password
The system SHALL accept a username and password and return a short-lived JWT on valid credentials.
(Previously: returned token without role)

#### Scenario: Successful login
- GIVEN a registered user with username "juan" and password "secret123"
- WHEN the user submits the login form
- THEN the system returns an access token containing `userId`, `username`, and `role`
- AND the user is redirected to the client list

#### Scenario: Invalid credentials
- GIVEN a registered user
- WHEN the user submits an incorrect password
- THEN the system returns HTTP 401 with message "Invalid credentials"
- AND no token is issued

#### Scenario: Unknown username
- GIVEN no user exists with username "nobody"
- WHEN a login attempt is made
- THEN the system returns HTTP 401 with message "Invalid credentials"

### Requirement: Token expiration and refresh
The system SHALL expire access tokens within a short lifetime and support silent refresh via a rotating refresh token.
(Previously: refresh reused the same payload without re-reading DB)

#### Scenario: Token expires
- GIVEN a user with an expired JWT
- WHEN the user makes an authenticated API request
- THEN the system returns HTTP 401
- AND the user is redirected to the login page

#### Scenario: Refresh with stale role
- GIVEN a user's role was changed in the database after token issuance
- WHEN the refresh endpoint is called
- THEN the new access token reflects the updated role from the database
