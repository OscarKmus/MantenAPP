# Software Management

## Purpose

Manage software licenses per client. A software record MAY be linked to exactly one equipment via `equipmentId`. The `GET /clients/:clientId/software` endpoint is removed.

## Requirements

### Requirement: Software creation

The system SHALL allow creating a `Software` record with an optional `equipmentId`.

#### Scenario: Assign to equipment

- GIVEN equipment "WS-01" exists
- WHEN a técnico creates software with `equipmentId` = "WS-01"
- THEN the software is linked to "WS-01"

#### Scenario: Create unassigned

- GIVEN a client exists
- WHEN a técnico creates software with no `equipmentId`
- THEN the software is persisted unassigned

### Requirement: Software-equipment cardinality

The system SHALL enforce that one software record belongs to at most one equipment.

#### Scenario: Reassign software

- GIVEN software "Lic-A" is on "WS-01"
- WHEN a técnico updates it to `equipmentId` = "WS-02"
- THEN "Lic-A" now belongs to "WS-02" and not "WS-01"

### Requirement: Per-client software list endpoint

The system SHALL NOT expose `GET /clients/:clientId/software`.

#### Scenario: Endpoint removed

- GIVEN a client calls `GET /clients/:clientId/software`
- THEN the system returns 404 Not Found

#### Scenario: Alternative access

- GIVEN a técnico needs software per client
- WHEN they call `GET /clients/:clientId/equipment` with `softwareLicenses` expanded
- THEN they receive software data via the equipment list
