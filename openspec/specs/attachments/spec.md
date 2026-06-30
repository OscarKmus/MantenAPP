# Maintenance Attachments — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Ownership on create
The system SHALL set `createdById` to the authenticated user's id when any authenticated user creates an attachment.

#### Scenario: USER creates attachment
- GIVEN an authenticated USER
- WHEN they upload a photo to a maintenance or item
- THEN the new attachment's `createdById` is the user's id

### Requirement: Ownership-based edit
The system SHALL allow a USER to edit only attachments they created. ADMIN SHALL be able to edit any attachment.

#### Scenario: USER edits own attachment
- GIVEN an attachment with `createdById` matching the authenticated USER
- WHEN the USER PATCH `/api/attachments/:id`
- THEN the update succeeds with 200 OK

#### Scenario: USER cannot edit another's attachment
- GIVEN an attachment with `createdById` belonging to another user
- WHEN the USER PATCH `/api/attachments/:id`
- THEN the system returns 403 Forbidden

#### Scenario: ADMIN can edit any attachment
- GIVEN any existing attachment
- WHEN an ADMIN PATCH `/api/attachments/:id`
- THEN the update succeeds with 200 OK

### Requirement: Delete restricted to ADMIN
The system SHALL restrict attachment deletion to ADMIN role.

#### Scenario: ADMIN deletes attachment
- GIVEN an existing attachment
- WHEN an ADMIN sends DELETE `/api/attachments/:id`
- THEN the attachment is removed and the system returns 204 No Content

#### Scenario: USER cannot delete attachment
- GIVEN an existing attachment
- WHEN a USER sends DELETE `/api/attachments/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot delete
- GIVEN no valid token
- WHEN any DELETE `/api/attachments/:id` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend delete UI gating
The frontend MUST hide remove-attachment buttons for non-ADMIN users.

#### Scenario: PhotoUpload remove hidden for USER
- GIVEN a USER viewing `PhotoUpload`
- WHEN the component renders
- THEN the remove attachment button is not present

## MODIFIED Requirements

### Requirement: Polymorphic attachment scope
The system SHALL support two attachment scopes: per-equipment-item and per-maintenance.
(Previously: any authenticated user could create and delete attachments without ownership checks)

#### Scenario: Attach photo to an item
- GIVEN a maintenance with a selected workstation
- WHEN a USER uploads a photo within the item form
- THEN the attachment is linked to scope "maintenance_item" with the item’s ID
- AND `createdById` is set to the current user

#### Scenario: Attach photo to maintenance overall
- GIVEN a maintenance in progress
- WHEN a USER uploads a site-wide photo on the report screen
- THEN the attachment is linked to scope "maintenance" with the maintenance ID
- AND `createdById` is set to the current user

#### Scenario: View attachments
- GIVEN a maintenance with 3 item-level and 2 maintenance-level photos
- WHEN the detail view renders
- THEN photos are grouped under their respective equipment sections and a "General" section
