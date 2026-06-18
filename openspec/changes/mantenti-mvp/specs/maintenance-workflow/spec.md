# Maintenance Workflow Specification

## Purpose

Orchestrate the core maintenance flow: select equipment, log per-item actions, optionally use templates, generate a report, collect a signature, and close with a PDF.

## Requirements

### Requirement: Equipment selection

The system SHALL allow the técnico to select one or more equipment items from the client’s pool to include in the maintenance.

#### Scenario: Manual selection

- GIVEN a client with 5 equipment items
- WHEN a técnico starts a new maintenance and selects 2 items
- THEN the maintenance draft is created with those 2 items

#### Scenario: Template-based selection

- GIVEN a saved template with 3 equipment items for this client
- WHEN a técnico starts maintenance from the template
- THEN the draft is pre-populated with the template’s 3 items

### Requirement: Per-item action logging

The system SHALL allow logging actions, observations, and attachments per selected equipment item.

#### Scenario: Log action on an item

- GIVEN a maintenance draft with a selected workstation
- WHEN a técnico chooses action type "Corrección", enters notes, and attaches a photo
- THEN the item shows the logged action with timestamp

#### Scenario: Skip an item temporarily

- GIVEN a maintenance with 3 items
- WHEN a técnico logs actions on 2 items and leaves 1 blank
- THEN the system warns before close that 1 item has no action logged

### Requirement: Signature capture

The system SHALL capture a técnico signature as a base64 PNG with minimum dimensions 300x100px before closing.

#### Scenario: Valid signature

- GIVEN all items are logged and photos attached
- WHEN a técnico draws a signature of 400x120px and submits
- THEN the maintenance transitions to "closed"

#### Scenario: Signature too small

- GIVEN a signature canvas with 200x80px drawn
- WHEN submission is attempted
- THEN the system rejects with "Signature too small"

### Requirement: Maintenance status lifecycle

The system SHALL track maintenance status as: Draft → In Progress → Closed.

#### Scenario: Close maintenance

- GIVEN a maintenance in In Progress with all required fields
- WHEN a técnico confirms closure with signature
- THEN status becomes Closed
- AND a PDF is generated asynchronously

#### Scenario: Reopen not allowed

- GIVEN a Closed maintenance
- WHEN a técnico attempts to edit it
- THEN the system returns 403 and prevents edits
