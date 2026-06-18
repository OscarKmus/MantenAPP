# User Authentication Specification

## Purpose

Authenticate technicians via JWT-based login. The system supports a single implicit role "técnico" with no admin or RBAC layers.

## Requirements

### Requirement: Login with username and password

The system SHALL accept a username and password and return a short-lived JWT on valid credentials.

#### Scenario: Successful login

- GIVEN a registered técnico with username "juan" and password "secret123"
- WHEN the user submits the login form
- THEN the system returns a JWT access token
- AND the user is redirected to the client list

#### Scenario: Invalid credentials

- GIVEN a registered técnico
- WHEN the user submits an incorrect password
- THEN the system returns HTTP 401 with message "Invalid credentials"
- AND no token is issued

#### Scenario: Unknown username

- GIVEN no user exists with username "nobody"
- WHEN a login attempt is made
- THEN the system returns HTTP 401 with message "Invalid credentials"

### Requirement: Token expiration and refresh

The system SHALL expire access tokens within a short lifetime and MAY support silent refresh via a rotating refresh token.

#### Scenario: Token expires

- GIVEN a user with an expired JWT
- WHEN the user makes an authenticated API request
- THEN the system returns HTTP 401
- AND the user is redirected to the login page

### Requirement: Password reset deferred

Password self-recovery SHALL NOT be implemented in the MVP.

#### Scenario: Forgot-password link absent

- GIVEN the login page
- WHEN the page renders
- THEN no "Forgot password" link is visible
- AND password resets require manual database intervention
