# Action Types Specification

## Purpose

Provide dynamic, técnico-created action types for maintenance items, pre-seeded with common defaults.

## Requirements

### Requirement: Dynamic action type CRUD

The system SHALL allow técnicos to create, list, and update action types. Action types MAY be soft-deleted if unused.

#### Scenario: Create a new action type inline

- GIVEN a maintenance form with an action type dropdown
- WHEN a técnico selects "+ Nuevo tipo", enters "Migración", and confirms
- THEN the type is saved and immediately selectable for that maintenance item

#### Scenario: List existing types

- GIVEN the maintenance form
- WHEN the action type dropdown opens
- THEN it shows all global and técnico-created types sorted alphabetically

#### Scenario: Prevent deletion of used type

- GIVEN an action type referenced by at least one maintenance item
- WHEN a técnico attempts to delete it
- THEN the system returns 409 and preserves the type

### Requirement: Pre-seeded defaults

The system SHALL seed the following default action types on first deployment: Mantención preventiva, Corrección, Reemplazo, Instalación, Otro.

#### Scenario: Defaults present on fresh install

- GIVEN a newly initialized database
- WHEN a técnico opens the action type dropdown
- THEN the five default types are visible

### Requirement: Visual differentiation

The system SHOULD support optional color or icon per action type to differentiate cards visually.

#### Scenario: Type with color renders

- GIVEN an action type with color #ff0000
- WHEN a maintenance card using this type is displayed
- THEN the card shows a visual indicator of the color
