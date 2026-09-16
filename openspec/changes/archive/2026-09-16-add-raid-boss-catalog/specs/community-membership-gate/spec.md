## MODIFIED Requirements

### Requirement: Application access requires community membership and a granted role

A user SHALL reach the application's functional screens only when they belong to
a community AND hold a role other than the default registration role. Failing
either condition, the user SHALL be shown an explanatory placeholder instead.

A functional screen is one built on a community's data — the boss timer, the
member list, the invitations section. Two kinds of screen are not functional
screens and the gate SHALL NOT be applied to either.

The first is the caller's own account: the profile area SHALL be reachable by
any signed-in user. Naming this is what the requirement was missing — an
implementation read "functional screens" as "every screen" and put the profile
behind the gate, which took the account-deletion control away from the users
`user-account-updates` names explicitly.

The second is game reference data — the raid-boss catalogue described by
`raid-boss-catalog`. It describes the game world rather than any community's
records, and it SHALL be reachable by a visitor who is not signed in at all.
Applying the gate to it would be a category error twice over: it would demand a
community from a reader who has no account, and it would hide data that is the
same for every community.

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

#### Scenario: The profile area is not a functional screen

- **WHEN** a user the gate refuses, for either reason, opens the profile area
- **THEN** their own account is shown, not a placeholder

#### Scenario: The catalogue is not a functional screen

- **WHEN** a user the gate refuses, for either reason, opens the raid-boss
  catalogue
- **THEN** the catalogue is shown, not a placeholder

#### Scenario: A visitor who is not signed in opens the catalogue

- **WHEN** a visitor with no account at all opens the raid-boss catalogue
- **THEN** the catalogue is shown, and no sign-in is demanded
