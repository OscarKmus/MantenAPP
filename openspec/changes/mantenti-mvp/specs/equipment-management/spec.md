# Equipment Management Specification

## Purpose

Manage equipment per client with network identifiers, assignment, and status tracking.

## Requirements

### Requirement: Equipment CRUD per client

The system SHALL allow CRUD operations for equipment linked to a specific client.

#### Scenario: Add equipment to a client

- GIVEN a client "Acme Corp"
- WHEN a técnico adds a workstation with IP 192.168.1.10, MAC aa:bb:cc:dd:ee:ff, serial SN123
- THEN the equipment appears under Acme Corp’s detail page

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

### Requirement: Equipment fields

The system SHALL store IP address, MAC address, serial number, assigned user name, and status per equipment.

#### Scenario: Validation of IP format

- GIVEN a técnico enters IP "999.999.999.999"
- WHEN saving the equipment
- THEN the system rejects with a validation error

#### Scenario: Validation of MAC format

- GIVEN a técnico enters MAC "invalid-mac"
- WHEN saving the equipment
- THEN the system rejects with a validation error

#### Scenario: Status options

- GIVEN the equipment form
- WHEN the status dropdown renders
- THEN it includes at minimum: Active, Inactive, Under maintenance, Decommissioned

### Requirement: Equipment list view

The system SHALL display a filterable list of equipment per client.

#### Scenario: Filter by status

- GIVEN 10 equipment entries with mixed statuses
- WHEN a técnico filters by "Active"
- THEN only active equipment is shown
