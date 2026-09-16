## REMOVED Requirements

### Requirement: Self-service updates accept only profile attributes

**Reason**: The requirement's allowlist names `collections`, and carries a
scenario asserting that collections tracking keeps working. Both describe an
attribute this change removes from the user model along with the item collection
feature that wrote it. The allowlist itself is still needed, so it returns below
as `Self-service updates accept only the surviving profile attributes` — this is
a replacement, not a withdrawal of the protection.

**Migration**: None for callers sending `email`, `username`, `password`,
`nickname` or `realname`; those are unchanged. A caller sending `collections`
moves from an accepted write to a validation error, which is the same answer the
allowlist already gave every other unknown attribute.

## ADDED Requirements

### Requirement: Self-service updates accept only the surviving profile attributes

A user updating their own account SHALL be able to change only their profile
attributes: `email`, `username`, `password`, `nickname`, and `realname`. Any
other attribute present in the request SHALL be rejected.

`collections` was on this list until the item collection feature was withdrawn.
The attribute it named no longer exists on the user model, so a request body
carrying it names nothing, and the allowlist rejects it like any other unknown
key rather than accepting a write that would go nowhere.

#### Scenario: Profile attribute is accepted

- **WHEN** an authenticated user submits an update of their own account
  containing only `nickname`
- **THEN** the account's `nickname` is changed and the response reflects the new
  value

#### Scenario: Self-assigning a role is rejected

- **WHEN** an authenticated user submits an update of their own account
  containing a `role` attribute
- **THEN** the request is rejected with a validation error
- **AND** the user's role is unchanged

#### Scenario: Self-assigning a community is rejected

- **WHEN** an authenticated user submits an update of their own account
  containing a `community` attribute
- **THEN** the request is rejected with a validation error
- **AND** the user's community membership is unchanged

#### Scenario: The withdrawn collections attribute is rejected

- **WHEN** an authenticated user submits an update of their own account
  containing only `collections`
- **THEN** the request is rejected with a validation error
