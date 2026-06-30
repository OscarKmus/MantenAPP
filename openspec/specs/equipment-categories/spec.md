# Equipment Categories — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: Catalog write restricted to ADMIN
The system SHALL restrict creation, update, and deletion of equipment categories to ADMIN. USER role SHALL have read-only access.

#### Scenario: ADMIN creates category
- GIVEN an authenticated ADMIN
- WHEN they POST `/api/equipment-categories`
- THEN the category is created with 201 Created

#### Scenario: USER cannot create category
- GIVEN an authenticated USER
- WHEN they POST `/api/equipment-categories`
- THEN the system returns 403 Forbidden

#### Scenario: USER cannot update category
- GIVEN an existing equipment category
- WHEN a USER sends PUT/PATCH `/api/equipment-categories/:id`
- THEN the system returns 403 Forbidden

#### Scenario: USER cannot delete category
- GIVEN an existing equipment category
- WHEN a USER sends DELETE `/api/equipment-categories/:id`
- THEN the system returns 403 Forbidden

#### Scenario: Unauthenticated cannot modify catalog
- GIVEN no valid token
- WHEN any write operation on `/api/equipment-categories` is attempted
- THEN the system returns 401 Unauthorized

### Requirement: Frontend catalog UI gating
The frontend MUST hide create, edit, and delete controls for equipment categories from non-ADMIN users.

#### Scenario: Category delete hidden for USER
- GIVEN a USER viewing `EquipmentForm`
- WHEN the category management section renders
- THEN the delete category control is not present

## MODIFIED Requirements

### Requirement: Equipment category CRUD
The system SHALL allow CRUD operations for equipment categories. Read access is shared across all authenticated users. Write operations are ADMIN-only.
(Previously: all técnicos could create, edit, and delete categories)
