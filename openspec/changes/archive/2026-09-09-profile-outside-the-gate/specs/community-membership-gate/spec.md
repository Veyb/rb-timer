## MODIFIED Requirements

### Requirement: Application access requires community membership and a granted role

A user SHALL reach the application's functional screens only when they belong to
a community AND hold a role other than the default registration role. Failing
either condition, the user SHALL be shown an explanatory placeholder instead.

A functional screen is one built on a community's data — the boss list, the
member list, the invitations section. The caller's own account is not one of
them: the profile area SHALL be reachable by any signed-in user, and the gate
SHALL NOT be applied to it. Naming this is what the requirement was missing —
an implementation read "functional screens" as "every screen" and put the
profile behind the gate, which took the account-deletion control away from the
users `user-account-updates` names explicitly.

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
- **THEN** the user can still sign out
- **AND** opening the profile area shows their own account, not the placeholder
  again — an implementation that only changed the address satisfied the earlier
  wording of this scenario while leaving the profile unreachable
