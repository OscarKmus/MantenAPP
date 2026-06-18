# Client Management Specification

## Purpose

Manage clients as shared cards with contact details, location, and a hybrid next-maintenance date computed from frequency, agreed date, and manual override.

## Requirements

### Requirement: Client CRUD

The system SHALL support create, read, update, and delete operations for clients. All técnicos share the same client list.

#### Scenario: Create a client

- GIVEN a técnico on the client list page
- WHEN they fill the client form (name, location, contact) and submit
- THEN the client appears in the shared card list

#### Scenario: Edit a client

- GIVEN an existing client card
- WHEN a técnico updates the contact phone and saves
- THEN the card reflects the new phone for all técnicos

#### Scenario: Delete a client

- GIVEN an existing client with no linked maintenances
- WHEN a técnico deletes the client
- THEN the client is removed and returns 204

#### Scenario: Prevent delete with history

- GIVEN an existing client with past maintenances
- WHEN a técnico attempts deletion
- THEN the system returns 409 and preserves the client

### Requirement: Hybrid next-maintenance model

The system SHALL maintain three next-maintenance states per client: base (computed from frequency), agreed (técnico-suggested), and effective (final override).

#### Scenario: Auto-suggest base date

- GIVEN a client with frequency_days = 30 and last maintenance on 2026-06-01
- WHEN the system recalculates next maintenance
- THEN next_maintenance_base_at is set to 2026-07-01

#### Scenario: Override effective date

- GIVEN a client with base date 2026-07-01
- WHEN a técnico manually sets next_maintenance_at to 2026-07-15
- THEN the effective date is 2026-07-15
- AND base and agreed dates remain visible for reference

#### Scenario: Agreed date differs from base

- GIVEN a client with base date 2026-07-01
- WHEN a técnico sets next_maintenance_agreed_at to 2026-07-10
- THEN the effective date updates to the agreed date unless manually overridden

### Requirement: Client cards responsive layout

The system SHALL render client cards in a responsive grid usable on 375px screens.

#### Scenario: Mobile view

- GIVEN a viewport width of 375px
- WHEN the client list loads
- THEN cards stack vertically with tappable areas ≥ 44x44px
