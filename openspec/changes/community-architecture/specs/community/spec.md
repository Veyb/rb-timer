## Purpose

Introduces the community as the unit the application is organised around: a
named group of players on one game server, created and staffed by operators
through the Strapi admin panel.

## ADDED Requirements

### Requirement: Community record

A community SHALL have a required `name`, a required `server` drawn from the
fixed set `Gamma`, `Black`, `White`, `Carmine`, `MasterWork`, and an optional
`logo` image.

#### Scenario: Community created with the required fields

- **WHEN** an operator creates a community with a name and a server from the
  permitted set
- **THEN** the community is stored and available for assignment to users

#### Scenario: Community without a name is rejected

- **WHEN** an operator attempts to create a community without a name
- **THEN** the operation is rejected with a validation error

#### Scenario: Community with an unknown server is rejected

- **WHEN** an operator attempts to create a community with a server outside the
  permitted set
- **THEN** the operation is rejected with a validation error

### Requirement: Community logo must be square

A community `logo`, when present, SHALL have equal width and height. A non-square
image SHALL be rejected at the point of assignment, whichever interface performs
it.

#### Scenario: Square logo is accepted

- **WHEN** an operator assigns an image whose width equals its height as a
  community logo
- **THEN** the community is saved with that logo

#### Scenario: Non-square logo is rejected

- **WHEN** an operator assigns an image whose width differs from its height as a
  community logo
- **THEN** the operation is rejected with a validation error identifying the
  aspect-ratio constraint
- **AND** the community keeps its previous logo, if any

### Requirement: Communities are managed only by operators

The set of communities SHALL NOT be readable, creatable, modifiable, or
deletable through the Content API by any end-user role. Community management
SHALL be available exclusively through the Strapi admin panel.

#### Scenario: End user requests the community list

- **WHEN** an authenticated user of any role requests the collection of
  communities through the Content API
- **THEN** the request is refused

#### Scenario: End user attempts to create a community

- **WHEN** an authenticated user of any role attempts to create a community
  through the Content API
- **THEN** the request is refused
- **AND** no community is created

### Requirement: A user belongs to at most one community

A user account SHALL reference at most one community. Assigning a community to a
user SHALL be possible only through the Strapi admin panel or by redeeming an
invite code.

#### Scenario: Operator assigns a community

- **WHEN** an operator assigns an existing community to a user in the admin panel
- **THEN** that user is a member of that community

#### Scenario: Operator reassigns a community

- **WHEN** an operator assigns a different community to a user who already has
  one
- **THEN** the user is a member of the new community only

#### Scenario: New account has no community

- **WHEN** a user registers
- **THEN** the account has no community membership

### Requirement: A member can read their own community

An authenticated user SHALL receive their own community's `name`, `server`, and
`logo` together with their own account details.

#### Scenario: Member reads own account

- **WHEN** a user who belongs to a community requests their own account details
- **THEN** the response includes the community's name, server, and logo

#### Scenario: Community-less user reads own account

- **WHEN** a user who belongs to no community requests their own account details
- **THEN** the response indicates the absence of a community rather than failing
