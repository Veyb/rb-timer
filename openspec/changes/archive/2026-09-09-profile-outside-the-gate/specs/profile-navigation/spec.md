## ADDED Requirements

### Requirement: The profile area is available to every signed-in user

The profile area SHALL be reachable by any signed-in user, whatever role they
hold and whether or not they belong to a community. What it offers SHALL vary
with what the caller has, not with whether the access gate would admit them:

- their own account details, always
- leaving their community, when they belong to one
- deleting their own account, always, as `user-account-updates` requires

#### Scenario: A user with no community opens the profile

- **WHEN** a user who belongs to no community opens the profile area
- **THEN** their own account details are shown
- **AND** the control for deleting their account is offered
- **AND** no control for leaving a community is offered, there being none

#### Scenario: A member the gate refuses opens the profile

- **WHEN** a user who belongs to a community but holds the default registration
  role opens the profile area
- **THEN** their own account details are shown
- **AND** both leaving the community and deleting the account are offered

#### Scenario: The menu entry leads somewhere

- **WHEN** any signed-in user follows the profile entry in the navigation
- **THEN** the profile area renders, rather than repeating the screen they came
  from
