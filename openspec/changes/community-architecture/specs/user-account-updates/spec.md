## Purpose

Defines which attributes of a user account are client-assignable and which are
privileged, so that no request body can grant its sender a role or a community
membership it was not given.

## ADDED Requirements

### Requirement: Self-service updates accept only profile attributes

A user updating their own account SHALL be able to change only their profile
attributes: `email`, `username`, `password`, `nickname`, `realname`, and
`collections`. Any other attribute present in the request SHALL be rejected.

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

#### Scenario: Collections tracking keeps working

- **WHEN** an authenticated user submits an update of their own account
  containing only `collections`
- **THEN** the update succeeds

### Requirement: Privileged attributes are never client-assignable

`role`, `community`, `confirmed`, `blocked`, `provider`, `resetPasswordToken`,
and `confirmationToken` SHALL NOT be settable through any Content API request
body, on any endpoint, regardless of the caller's role. Changing them SHALL be
possible only through the Strapi admin panel or through a dedicated endpoint
whose contract names the single attribute it changes.

#### Scenario: Privileged attribute in a body targeting another account

- **WHEN** any authenticated caller submits an update targeting another user's
  account with a `role` or `community` attribute in the body
- **THEN** the request is rejected
- **AND** the target account is unchanged

#### Scenario: Unknown attribute is rejected rather than ignored

- **WHEN** an update request body contains an attribute that is neither a
  profile attribute nor part of the endpoint's declared contract
- **THEN** the request is rejected with a validation error naming the offending
  attribute

### Requirement: Registration cannot pre-assign membership or role

Self-registration SHALL create an account with the default role and no
community membership, ignoring any role or community supplied by the client.

#### Scenario: Registration body carries a role

- **WHEN** a client registers with a body containing `role` or `community`
- **THEN** registration either succeeds with the default role and no community,
  or is rejected
- **AND** the created account never has the supplied role or community
