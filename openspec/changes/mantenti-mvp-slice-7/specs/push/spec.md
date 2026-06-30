# Push Subscription — Delta for mantenti-mvp-slice-7

## ADDED Requirements

### Requirement: ADMIN can delete any push subscription
The system SHALL allow an ADMIN to delete any push subscription.

#### Scenario: ADMIN deletes user's subscription
- GIVEN an existing push subscription belonging to a USER
- WHEN an ADMIN sends DELETE `/api/push/subscriptions/:endpoint`
- THEN the subscription is removed and the system returns 204 No Content

#### Scenario: USER deletes own subscription
- GIVEN an existing push subscription belonging to the authenticated USER
- WHEN the USER sends DELETE `/api/push/subscriptions/:endpoint`
- THEN the subscription is removed and the system returns 204 No Content

#### Scenario: USER cannot delete another's subscription
- GIVEN an existing push subscription belonging to another user
- WHEN a USER sends DELETE `/api/push/subscriptions/:endpoint`
- THEN the system returns 403 Forbidden

## MODIFIED Requirements

### Requirement: Remove subscription
The system SHALL delete the matching push subscription for the authenticated user or an ADMIN.
(Previously: scoped strictly to the subscription owner)

#### Scenario: Remove subscription as owner
- GIVEN a user sends DELETE `/api/push/subscriptions/:endpoint` for their own subscription
- THEN the system deletes the matching subscription
- AND returns 204 No Content
- AND if the subscription does not exist, returns 404 Not Found

#### Scenario: Remove subscription as ADMIN
- GIVEN an ADMIN sends DELETE `/api/push/subscriptions/:endpoint`
- THEN the system deletes the matching subscription regardless of owner
- AND returns 204 No Content
