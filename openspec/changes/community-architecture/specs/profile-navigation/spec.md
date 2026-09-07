## Purpose

Defines where the profile area opens and which of its sections a given user can
see, so that the item collection feature can be withdrawn and invite management
introduced without breaking existing entry points.

## ADDED Requirements

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

### Requirement: Officers see an invite management section

The profile area SHALL offer an invite management section to users holding
`officer`, and SHALL NOT offer it to any other role.

#### Scenario: Officer opens the profile area

- **WHEN** a user holding `officer` opens the profile area
- **THEN** an invite management section is offered

#### Scenario: Non-officer opens the profile area

- **WHEN** a user holding `viewer` or `editor` opens the profile area
- **THEN** no invite management section is offered

#### Scenario: Officer without a community

- **WHEN** a user holding `officer` who belongs to no community opens the profile
  area
- **THEN** no invite management section is offered

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
