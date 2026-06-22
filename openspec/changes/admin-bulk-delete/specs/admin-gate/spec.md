# Admin Gate Specification

## Purpose

Provide a shared admin password gate that issues short-lived signed tokens for destructive bulk operations without introducing a new RBAC role.

## Requirements

### Requirement: Server config

The server MUST read `ADMIN_PASSWORD` from environment variables on boot. The server MUST refuse to start if the variable is missing or shorter than 12 characters, surfacing an error that names the variable and the minimum length.

#### Scenario: Boot with missing password

- GIVEN the server starts with `ADMIN_PASSWORD` unset
- WHEN the environment is validated
- THEN the process exits with an error naming the variable and minimum length

#### Scenario: Boot with short password

- GIVEN the server starts with `ADMIN_PASSWORD` set to "short"
- WHEN the environment is validated
- THEN the process exits with an error naming the variable and the 12-character minimum

### Requirement: Verify endpoint

The system SHALL expose `POST /api/admin/verify` accepting `{ password: string }`. On match it SHALL return 200 `{ ok: true, token: string, expiresIn: number }`. On mismatch it SHALL return 401 `{ ok: false, error: 'invalid_password' }`. Password comparison MUST use `crypto.timingSafeEqual`; direct comparison with `===` or `==` MUST NOT be used.

#### Scenario: Valid password returns token

- GIVEN `ADMIN_PASSWORD` is configured
- WHEN a request sends the correct password
- THEN the response is 200 with `ok: true`, a token, and `expiresIn: 300`

#### Scenario: Wrong password returns 401

- GIVEN `ADMIN_PASSWORD` is configured
- WHEN a request sends an incorrect password
- THEN the response is 401 with `ok: false` and `error: 'invalid_password'`

#### Scenario: Missing password field returns 400

- GIVEN a request to `POST /api/admin/verify`
- WHEN the body omits the `password` field
- THEN the response is 400 with a validation error

### Requirement: Token shape

The token MUST be a signed JWT containing claims `{ sub: 'admin', iat, exp }` where `exp` is `iat + 300` seconds. The signing key MUST be derived from `ADMIN_PASSWORD` via HKDF, or the password itself if it is at least 32 bytes with acceptable entropy.

#### Scenario: Token expiry is 5 minutes

- GIVEN a successful verify request
- WHEN the token is inspected
- THEN `sub` is `'admin'` and `exp - iat` equals 300

### Requirement: Token verification

The system MUST expose `requireAdminToken` middleware that validates the JWT signature and expiry. On success it MUST attach `req.adminToken = { valid: true, exp }`. On invalid signature it MUST reject with 401 `{ error: 'admin_token_invalid' }`. On expired token it MUST reject with 401 `{ error: 'admin_token_expired' }`.

#### Scenario: Expired token rejected

- GIVEN a token issued 6 minutes ago
- WHEN it is presented to a protected endpoint
- THEN the response is 401 with `error: 'admin_token_expired'`

#### Scenario: Tampered token rejected

- GIVEN a valid token with an altered signature
- WHEN it is presented to a protected endpoint
- THEN the response is 401 with `error: 'admin_token_invalid'`

### Requirement: Rate limit

`POST /api/admin/verify` MUST be rate-limited to 5 attempts per 15 minutes per client IP. Excess attempts MUST return 429 `{ error: 'rate_limited' }` with a `Retry-After` header.

#### Scenario: Sixth attempt blocked

- GIVEN 5 failed verify attempts from the same IP in 15 minutes
- WHEN a 6th attempt is made
- THEN the response is 429 with `error: 'rate_limited'` and a `Retry-After` header

### Requirement: Audit logging

Every successful verify MUST log a line containing the timestamp and client IP. Every failed verify MUST also log a line containing the timestamp and client IP. No personally identifiable information beyond the IP address MUST be logged.

#### Scenario: Successful verify logged

- GIVEN a successful verify request from IP 192.168.1.10
- WHEN the request completes
- THEN a log line contains the timestamp and IP

#### Scenario: Failed verify logged

- GIVEN a failed verify request from IP 192.168.1.10
- WHEN the request completes
- THEN a log line contains the timestamp and IP
