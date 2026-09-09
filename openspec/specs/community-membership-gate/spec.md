# community-membership-gate Specification

## Purpose
Defines what a signed-in user can reach, based on two independent axes:
whether they belong to a community, and what role they hold within it.

## Requirements

### Requirement: Application access requires community membership and a granted role

A user SHALL reach the application's functional screens only when they belong to
a community AND hold a role other than the default registration role. Failing
either condition, the user SHALL be shown an explanatory placeholder instead.

#### Scenario: Member with a granted role

- **WHEN** a user who belongs to a community and holds the `viewer`, `editor`, or
  `officer` role opens the application
- **THEN** the functional screens are available

#### Scenario: Member still on the default role

- **WHEN** a user who belongs to a community but still holds the default
  registration role opens the application
- **THEN** a placeholder is shown directing them to an officer of their community

#### Scenario: Granted role without membership

- **WHEN** a user who holds `viewer`, `editor`, or `officer` but belongs to no
  community opens the application
- **THEN** the community-less placeholder is shown

### Requirement: Community-less users are prompted for an invite code

A user who belongs to no community SHALL be shown a placeholder that explains
they must redeem an invite code or contact an administrator, and that offers a
way to submit a code.

#### Scenario: Community-less user opens the application

- **WHEN** a user who belongs to no community opens any functional screen
- **THEN** the placeholder explains the need for an invite code
- **AND** an input for submitting a code is available

#### Scenario: Placeholder replaces functional content, not the shell

- **WHEN** the community-less placeholder is shown
- **THEN** the user can still reach their own profile and sign out

### Requirement: Role determines capabilities within a community

Within their own community, `viewer` SHALL be able to read shared data,
`editor` SHALL additionally be able to modify it, and `officer` SHALL
additionally be able to administer members and invite codes. No role SHALL grant
any capability outside the user's own community.

#### Scenario: Viewer attempts a modification

- **WHEN** a user holding `viewer` attempts to modify shared community data
- **THEN** the attempt is refused

#### Scenario: Editor attempts to administer members

- **WHEN** a user holding `editor` attempts to change another member's role or
  create an invite code
- **THEN** the attempt is refused

#### Scenario: Officer administers own community

- **WHEN** a user holding `officer` administers members or invite codes of their
  own community
- **THEN** the operation is permitted

### Requirement: Gate changes do not alter boss list access

Access to the boss list SHALL continue to require community membership and a
granted role, as with every other functional screen.

#### Scenario: Community-less user requests the boss list

- **WHEN** a user who belongs to no community opens the boss list screen
- **THEN** the community-less placeholder is shown instead of the list
