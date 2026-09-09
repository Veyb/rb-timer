# profile-navigation Specification

## Purpose
Defines where the profile area opens and which of its sections a given user can
see, so that the item collection feature can be withdrawn and invite management
introduced without breaking existing entry points.

## Requirements

### Requirement: The profile area opens on management

Opening the profile area without naming a section SHALL land on the management
section.

#### Scenario: Profile opened without a section

- **WHEN** a signed-in user opens the profile area without naming a section
- **THEN** the management section is shown

### Requirement: The item collection section is withdrawn from navigation

The item collection section SHALL NOT be reachable from any navigation element.
Its route SHALL remain functional for the moment so that existing links do not
break.

#### Scenario: Navigation offers no collection entry

- **WHEN** a signed-in user of any role inspects the profile navigation
- **THEN** no entry leads to the item collection section

#### Scenario: Existing collection link still resolves

- **WHEN** a user opens the item collection route directly
- **THEN** the section still renders

### Requirement: Invitations are their own section, offered to officers only

Invitations SHALL be a navigable section of their own rather than part of the
profile area: issuing codes and reading who came in by them is running a
community, not tending one's own account. The profile area SHALL offer neither.

A navigation entry leading to it SHALL be offered only to users holding
`officer` who belong to a community. Opening the section without naming a
subsection SHALL land on its code list, and it SHALL carry two subsections —
the codes and the record of admissions.

Reaching the section by its address without that role SHALL be answered with a
statement that it is for officers, not with a redirect or a missing page: the
existence of officers and invitations in a community is not a secret, and a
reader who followed a link deserves to know why there is nothing there.

#### Scenario: Officer inspects the navigation

- **WHEN** a user holding `officer` who belongs to a community inspects the
  navigation
- **THEN** an entry leading to the invitations section is offered

#### Scenario: Non-officer inspects the navigation

- **WHEN** a user holding `viewer` or `editor` inspects the navigation
- **THEN** no entry leading to the invitations section is offered

#### Scenario: Officer without a community

- **WHEN** a user holding `officer` who belongs to no community inspects the
  navigation
- **THEN** no entry leading to the invitations section is offered

#### Scenario: Section opened without a subsection

- **WHEN** an officer opens the invitations section without naming a subsection
- **THEN** the code list is shown

#### Scenario: Non-officer opens the section by its address

- **WHEN** a member who is not an officer opens the invitations section directly
- **THEN** they are told the section is for officers
- **AND** neither the codes nor the record of admissions is shown

#### Scenario: The profile area no longer carries invitations

- **WHEN** a user holding `officer` opens the profile area
- **THEN** no invitation section appears among its sections

### Requirement: The member list entry follows the access gate

A navigation entry leading to the community member list SHALL be offered only to
users who have passed the access gate.

#### Scenario: Gated user sees the member list entry

- **WHEN** a user who belongs to a community and holds a granted role inspects
  the navigation
- **THEN** an entry leading to the member list is offered

#### Scenario: Community-less user sees no member list entry

- **WHEN** a user who belongs to no community inspects the navigation
- **THEN** no entry leading to the member list is offered
