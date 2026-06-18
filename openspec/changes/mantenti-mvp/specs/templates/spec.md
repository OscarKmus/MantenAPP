# Templates Specification

## Purpose

Allow técnicos to save and reuse predefined equipment sets for recurring maintenance on a client, reducing manual selection.

## Requirements

### Requirement: Template CRUD

The system SHALL allow creating, reading, updating, and deleting maintenance templates per client. Templates are shared across all técnicos.

#### Scenario: Create a template

- GIVEN a client with 5 equipment items
- WHEN a técnico selects 3 items and saves as template "Monthly Check"
- THEN the template appears in the template list for that client

#### Scenario: Use template to start maintenance

- GIVEN a template "Monthly Check" with 3 equipment items
- WHEN a técnico starts maintenance and chooses the template
- THEN the draft is pre-populated with those 3 items

#### Scenario: Edit template

- GIVEN an existing template with 2 items
- WHEN a técnico adds a third item and saves
- THEN future uses of the template include the third item

#### Scenario: Delete template

- GIVEN an existing template
- WHEN a técnico deletes it
- THEN the template is removed
- AND past maintenances created from it remain intact

### Requirement: Template metadata

The system SHALL store a template name, optional description, client reference, and ordered equipment list.

#### Scenario: Name uniqueness per client

- GIVEN a client already has a template named "Monthly Check"
- WHEN a técnico creates another template with the same name
- THEN the system rejects with a validation error

### Requirement: Template list on client page

The system SHOULD display available templates on the client detail page for quick maintenance start.

#### Scenario: Templates visible

- GIVEN a client with 2 saved templates
- WHEN the client detail page renders
- THEN a "Start from template" section lists both templates
