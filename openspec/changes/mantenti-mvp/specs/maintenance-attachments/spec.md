# Maintenance Attachments Specification

## Purpose

Support photo and file attachments scoped either to an individual maintenance item or to the maintenance as a whole, using a polymorphic storage model.

## Requirements

### Requirement: Polymorphic attachment scope

The system SHALL support two attachment scopes: per-equipment-item (maintenance_item) and per-maintenance (maintenance).

#### Scenario: Attach photo to an item

- GIVEN a maintenance with a selected workstation
- WHEN a técnico uploads a photo within the item form
- THEN the attachment is linked to scope "maintenance_item" with the item’s ID

#### Scenario: Attach photo to maintenance overall

- GIVEN a maintenance in progress
- WHEN a técnico uploads a site-wide photo on the report screen
- THEN the attachment is linked to scope "maintenance" with the maintenance ID

### Requirement: Upload limits

The system SHALL enforce a maximum file size of 10MB per file and a maximum of 20 photos per maintenance.

#### Scenario: File too large

- GIVEN a 15MB image
- WHEN upload is attempted
- THEN the system rejects with "File exceeds 10MB limit"

#### Scenario: Photo count exceeded

- GIVEN a maintenance already has 20 photos
- WHEN a técnico attempts to upload one more
- THEN the system rejects with "Maximum 20 photos per maintenance"

### Requirement: Attachment listing

The system SHALL list attachments grouped by scope in the maintenance detail view.

#### Scenario: View attachments

- GIVEN a maintenance with 3 item-level and 2 maintenance-level photos
- WHEN the detail view renders
- THEN photos are grouped under their respective equipment sections and a "General" section
