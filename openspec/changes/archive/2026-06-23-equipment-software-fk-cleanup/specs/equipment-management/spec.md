# Delta for Equipment Management

## Purpose

Make `Software.equipmentId` the single source of truth for the equipment-software relationship. Remove the `Equipment.softwareId` dual-FK path and update UI and API accordingly.

## ADDED Requirements

### Requirement: Equipment detail software list

The system SHALL render a read-only list of installed software on the equipment detail view, populated from `softwareLicenses`.

#### Scenario: Equipment with software

- GIVEN equipment "WS-01" has two software licenses linked via `Software.equipmentId`
- WHEN a técnico opens the equipment detail
- THEN the system displays both entries as badges/cards showing name, license type, expiration, and notes

#### Scenario: Empty software list

- GIVEN equipment "WS-02" has no linked software
- WHEN a técnico opens the equipment detail
- THEN the system shows the empty state "Sin software instalado"

### Requirement: Equipment card software badges

The system SHALL render installed software as small badges on equipment cards in list views.

#### Scenario: Multiple software badges

- GIVEN equipment "WS-03" has three software licenses
- WHEN the card renders in `EquipmentList.vue` or `InventoryPage.vue`
- THEN the card shows a flex-wrap row of up to three small badges

#### Scenario: No software badges

- GIVEN equipment "WS-04" has no linked software
- WHEN the card renders
- THEN the card shows no software badge area

### Requirement: Equipment API read responses

The system SHALL return `softwareLicenses: Software[]` on equipment read endpoints.

#### Scenario: Read with software

- GIVEN equipment "WS-05" has two linked software licenses
- WHEN the system responds to `GET /equipment/:id` or `GET /clients/:clientId/equipment`
- THEN the response contains `softwareLicenses` as an array
- AND the response does not contain a top-level `software` field

#### Scenario: Read without software

- GIVEN equipment "WS-06" has no linked software
- WHEN the system responds to a read endpoint
- THEN the response contains `softwareLicenses: []`
- AND the response does not contain a top-level `software` field

## MODIFIED Requirements

### Requirement: Equipment CRUD per client

The system SHALL allow CRUD operations for equipment linked to a specific client.
(Previously: did not constrain request body regarding software assignment.)

#### Scenario: Add equipment to a client

- GIVEN a client "Acme Corp"
- WHEN a técnico adds a workstation with IP 192.168.1.10, MAC aa:bb:cc:dd:ee:ff, serial SN123
- THEN the equipment appears under Acme Corp's detail page

#### Scenario: Edit equipment

- GIVEN an existing equipment entry
- WHEN a técnico updates the assigned user to "Maria Gomez"
- THEN the change is persisted and visible immediately

#### Scenario: Delete equipment

- GIVEN an equipment entry with no maintenance history
- WHEN a técnico deletes it
- THEN the equipment is removed

#### Scenario: Prevent delete with maintenance history

- GIVEN equipment referenced in at least one maintenance record
- WHEN a técnico attempts deletion
- THEN the system returns 409 and prevents removal

#### Scenario: Create rejects softwareId

- GIVEN a client "Acme Corp"
- WHEN a técnico POSTs to `/clients/:clientId/equipment` with a `softwareId` field
- THEN the system returns 400 Bad Request

#### Scenario: Update rejects softwareId

- GIVEN an existing equipment entry
- WHEN a técnico PATCHes `/equipment/:id` with a `softwareId` field
- THEN the system returns 400 Bad Request

## REMOVED Requirements

### Requirement: Equipment create form software dropdown

(Reason: Software assignment belongs in the SOFTWARE tab via `Software.equipmentId`.)
(Migration: Remove the dropdown from `EquipmentForm.vue`.)

### Requirement: Equipment update form software dropdown

(Reason: Same as create form — assignment is handled in the SOFTWARE tab.)
(Migration: Remove the dropdown and related refs/watchers/helpers from `EquipmentForm.vue`.)
