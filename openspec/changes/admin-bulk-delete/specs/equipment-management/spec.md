<!-- delta: see openspec/changes/mantenti-mvp/specs/equipment-management/spec.md -->

# Delta for Equipment Management

## Purpose

Extend equipment management with multi-select bulk deletion protected by an admin token gate, including cascade preview and transaction safety.

## ADDED Requirements

### Requirement: Bulk delete endpoint

The system MUST expose a bulk delete endpoint for equipment that requires `requireAdminToken` middleware. The endpoint MUST accept `{ ids: string[], adminToken: string }`, validate that `ids` is non-empty and contains no more than 100 entries, and return 200 `{ deleted: number, ids: string[] }` on success. On validation error it MUST return 400. On missing or invalid admin token it MUST return 401. If any id fails a foreign-key or existence check, the response MUST be 207-style `{ deleted: string[], skipped: { id, reason }[] }`.

#### Scenario: Bulk delete with valid token and ids

- GIVEN 3 existing equipment entries and a valid admin token
- WHEN `DELETE /api/equipment/bulk` is called with their ids and the token
- THEN the response is 200 with `deleted: 3` and the list of ids

#### Scenario: Bulk delete with expired token

- GIVEN a request with an expired admin token
- WHEN `DELETE /api/equipment/bulk` is called
- THEN the response is 401 with `error: 'admin_token_expired'`

#### Scenario: Bulk delete with too many ids

- GIVEN a request with 101 equipment ids
- WHEN `DELETE /api/equipment/bulk` is called
- THEN the response is 400 with `error: 'batch_too_large'`

### Requirement: Cascade preview

The system MUST expose `POST /api/equipment/cascade-preview` that accepts `{ ids: string[] }` and returns the count of entities that would be deleted as a cascade: `{ equipment: number, maintenanceItems: number, attachments: number, files: number }`. This endpoint MUST require the standard user JWT, not an admin token.

#### Scenario: Cascade preview for equipment with maintenance items

- GIVEN 1 equipment entry linked to 2 maintenance items
- WHEN `POST /api/equipment/cascade-preview` is called with the equipment id
- THEN the response includes `equipment: 1`, `maintenanceItems: 2`, and counts for related entities

### Requirement: Cascade transaction

Bulk delete MUST run inside a single database transaction. On any failure, the entire transaction MUST roll back. Any `skipped` items in the response MUST result from pre-transaction validation only, not from mid-transaction failure.

#### Scenario: Transaction rolls back on failure

- GIVEN a bulk delete request where one id fails a pre-transaction existence check
- WHEN the endpoint processes the request
- THEN no database mutations occur and the response lists the skipped item

### Requirement: UI multi-select

The Equipment list MUST render a checkbox column. The list header MUST render a "select all" checkbox. When one or more items are selected, a bulk action bar MUST appear showing the selection count and a "Borrar N equipos" button.

#### Scenario: Select three equipment entries

- GIVEN the Equipment list with multiple entries
- WHEN the técnico selects 3 entries using row checkboxes
- THEN the bulk action bar appears with "Borrar 3 equipos"

### Requirement: UI cascade preview modal

Clicking "Borrar N equipos" MUST open a modal that calls the cascade preview endpoint and displays the breakdown. The user MUST confirm the preview to proceed to the admin password modal.

#### Scenario: Open cascade preview modal

- GIVEN 3 equipment entries are selected and the bulk action bar is visible
- WHEN the técnico clicks "Borrar 3 equipos"
- THEN the cascade preview modal opens showing the entity breakdown

### Requirement: UI admin password modal

The admin password modal MUST contain a single password input and "Cancelar" and "Confirmar" buttons. On submit it MUST call the verify endpoint. On 200 it MUST send the bulk delete request with the returned token. On 401 it MUST display "Contraseña incorrecta" and clear the input. On 429 it MUST display "Demasiados intentos, esperá 15 minutos".

#### Scenario: Wrong password shows error

- GIVEN the admin password modal is open
- WHEN the técnico enters an incorrect password and submits
- THEN the modal shows "Contraseña incorrecta" and the input is cleared

#### Scenario: Correct password executes delete

- GIVEN the admin password modal is open
- WHEN the técnico enters the correct password and submits
- THEN the bulk delete request is sent, and on success a toast shows "3 equipos eliminados"

### Requirement: Single delete unchanged

The existing single `DELETE /api/equipment/:id` flow MUST NOT be altered by this slice. It MUST continue to use the browser `confirm()` prompt and MUST NOT require an admin token.

#### Scenario: Single delete still uses confirm

- GIVEN an existing equipment entry
- WHEN the técnico triggers single delete
- THEN the browser `confirm()` dialog appears and no admin token is requested
