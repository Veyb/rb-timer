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

### Requirement: A member may leave their community

A member SHALL be able to leave their community themselves. Leaving SHALL clear
the membership and reset the role to the one registration grants, so that a
role earned inside a community does not travel out of it.

#### Scenario: Member leaves

- **WHEN** a member of a community asks to leave it
- **THEN** they belong to no community
- **AND** they hold the default registration role
- **AND** they are shown the placeholder prompting for an invite code

#### Scenario: Community-less user asks to leave

- **WHEN** a user who belongs to no community asks to leave one
- **THEN** the request is refused

### Requirement: The last officer of a community may not leave it

Leaving SHALL be refused for an officer who is the only officer of their
community. Nothing self-service can appoint a replacement, so the community
would be left with nobody able to administer members or invite codes.

#### Scenario: Sole officer asks to leave

- **WHEN** the only officer of a community asks to leave it
- **THEN** the request is refused with a reason naming the constraint
- **AND** they remain a member with the officer role

#### Scenario: One of several officers asks to leave

- **WHEN** an officer of a community that has another officer asks to leave
- **THEN** the request succeeds

### Requirement: The registration default is not a rank an officer may assign

The roles an officer may assign SHALL be `viewer`, `editor` and `officer` only.
The role registration grants SHALL NOT be among them.

Assigning it would leave a member inside the community with no access and no
account of why — which is what removing them from the community already does,
except that removal names itself, asks for confirmation, and can be undone with
an invite code. A member an operator has left on that role SHALL still be
raisable by an officer, so nobody is stranded by its absence.

#### Scenario: Officer reads the assignable roles

- **WHEN** an officer reads the roles they may assign
- **THEN** the registration default is not among them

#### Scenario: Officer attempts to assign it anyway

- **WHEN** an officer sets a member's role to the registration default
- **THEN** the request is rejected with a validation error
- **AND** the member's role is unchanged

#### Scenario: A member left on the default role by an operator

- **WHEN** an officer changes the role of a member of their community who holds
  the registration default
- **THEN** the change succeeds

### Requirement: An officer may remove a member from their community

An officer SHALL be able to remove any member of their own community except
themselves, whatever role that member holds. Removal SHALL clear the membership
and reset the role, exactly as leaving does. An officer SHALL NOT be able to
remove a user of another community or a user with no community.

#### Scenario: Officer removes a member

- **WHEN** an officer removes a member of their own community
- **THEN** that member belongs to no community
- **AND** that member holds the default registration role

#### Scenario: Officer removes another officer

- **WHEN** an officer removes a fellow officer of their own community
- **THEN** the removal succeeds

#### Scenario: Officer removes themselves

- **WHEN** an officer asks to remove their own account from the community
- **THEN** the request is refused
- **AND** they remain a member

#### Scenario: Officer targets another community

- **WHEN** an officer asks to remove a user who belongs to another community
- **THEN** the request answers as not-found and the user keeps their membership

#### Scenario: Non-officer attempts a removal

- **WHEN** a member holding `viewer` or `editor` asks to remove another member
- **THEN** the request is refused

### Requirement: A member can read their own community

An authenticated user SHALL receive their own community's `name`, `server`, and
`logo` together with their own account details.

#### Scenario: Member reads own account

- **WHEN** a user who belongs to a community requests their own account details
- **THEN** the response includes the community's name, server, and logo

#### Scenario: Community-less user reads own account

- **WHEN** a user who belongs to no community requests their own account details
- **THEN** the response indicates the absence of a community rather than failing
