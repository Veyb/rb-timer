## Purpose

Guarantees that a user can observe and act on members of their own community
only, across every transport the application exposes, so that no request
crafted outside the application's own UI can reach another community's data.

## ADDED Requirements

### Requirement: An officer reads roles as names, not as the plugin's records

The list of roles an officer may assign SHALL be served by this application and
SHALL carry nothing but each role's display name and type. The
users-permissions plugin's own role endpoints SHALL NOT be granted to any role.

Those endpoints answer with `nb_users` — how many accounts hold each role across
every community in the installation — and, for a single role, the complete set
of actions it may call. Neither belongs to an officer, who administers one
community and is not an operator of the application.

#### Scenario: Officer reads the assignable roles

- **WHEN** an officer reads the role list
- **THEN** each entry carries a name and a type and nothing else
- **AND** no count of accounts and no permission list appears

#### Scenario: Officer calls the plugin's role endpoints

- **WHEN** an officer requests the users-permissions role list, or one role by
  its id
- **THEN** the attempt is refused

#### Scenario: A member who is not an officer

- **WHEN** a `viewer` or an `editor` reads the role list
- **THEN** the attempt is refused

### Requirement: One kind of identifier

Every document this application's own endpoints return or accept SHALL be named
by its `documentId`, as Strapi 5 names documents and as its own routes do. The
numeric primary key SHALL NOT appear in any response or be accepted in any
address, and a role SHALL be named by its `type` rather than by an id.

#### Scenario: A member is addressed by documentId

- **WHEN** a member is read, their role changed, or they are removed from a
  community
- **THEN** the address carries their `documentId`
- **AND** the numeric key does not appear in any response

#### Scenario: A numeric key is not an address

- **WHEN** an officer addresses a member endpoint with a numeric key
- **THEN** the response is the same not-found answer a stranger's document gets

#### Scenario: A role is named by its type

- **WHEN** an officer changes a member's role
- **THEN** the request names the role by its `type`
- **AND** a request naming anything else is rejected

### Requirement: The user collection is not reachable through the Content API

Listing, reading, counting, updating, and deleting user accounts SHALL NOT be
available through the general-purpose user endpoints to any end-user role.
Member data SHALL be reachable only through endpoints whose contract scopes
every result to the caller's own community.

#### Scenario: Direct request for the user collection

- **WHEN** an authenticated user of any role requests the general-purpose user
  collection endpoint
- **THEN** the request is refused

#### Scenario: Direct request for an arbitrary user by identifier

- **WHEN** an authenticated user of any role requests an arbitrary user account
  by identifier through the general-purpose endpoint
- **THEN** the request is refused

#### Scenario: Direct deletion of a user account

- **WHEN** an authenticated user of any role attempts to delete a user account
  through the general-purpose endpoint
- **THEN** the request is refused
- **AND** no account is deleted

### Requirement: Member listing is scoped to the caller's community

A member listing request SHALL return exactly the users belonging to the
caller's own community. Users of other communities and users without a community
SHALL NOT appear.

#### Scenario: Member lists own community

- **WHEN** a user belonging to community A requests the member list
- **THEN** the response contains members of community A only

#### Scenario: Community-less users are excluded

- **WHEN** a user belonging to community A requests the member list and accounts
  without a community exist
- **THEN** none of those accounts appear in the response

#### Scenario: Community-less caller requests the member list

- **WHEN** a user who belongs to no community requests the member list
- **THEN** the request is refused

### Requirement: The community scope cannot be widened by the client

The community used to scope a request SHALL be derived from the authenticated
caller's own membership. Any community identifier, filter, or population
directive supplied by the client SHALL NOT widen the result set.

#### Scenario: Client supplies a foreign community filter

- **WHEN** a user belonging to community A requests the member list with a
  filter naming community B
- **THEN** the response still contains members of community A only

#### Scenario: Client supplies a filter that removes the scope

- **WHEN** a user belonging to community A requests the member list with a
  filter or query directive intended to disable community filtering
- **THEN** the response still contains members of community A only

### Requirement: Member detail is scoped to the caller's community

Reading a single member SHALL succeed only when that member belongs to the
caller's own community, and SHALL be indistinguishable from a missing record
otherwise.

#### Scenario: Reading a member of the same community

- **WHEN** a user belonging to community A reads a member of community A
- **THEN** the member's details are returned

#### Scenario: Reading a member of another community

- **WHEN** a user belonging to community A reads a user of community B by
  identifier
- **THEN** the response is a not-found result that does not disclose the
  account's existence

### Requirement: Role administration is scoped to the caller's community

An officer SHALL be able to change the role only of members of their own
community, and only through an endpoint whose contract changes nothing but the
role.

#### Scenario: Officer changes a role in own community

- **WHEN** an officer of community A changes the role of a member of community A
- **THEN** the member's role is changed

#### Scenario: Officer targets another community

- **WHEN** an officer of community A attempts to change the role of a user of
  community B
- **THEN** the attempt is refused
- **AND** the target user's role is unchanged

#### Scenario: Officer targets a community-less user

- **WHEN** an officer of community A attempts to change the role of a user who
  belongs to no community
- **THEN** the attempt is refused

#### Scenario: Non-officer attempts role administration

- **WHEN** a user holding `viewer` or `editor` attempts to change any member's
  role
- **THEN** the attempt is refused

### Requirement: Member data exposes no account secrets

Member listings and member details SHALL NOT expose password hashes, reset or
confirmation tokens, or email addresses of other users.

#### Scenario: Member list content

- **WHEN** a user requests the member list of their own community
- **THEN** no entry contains a password hash, a reset token, a confirmation
  token, or another user's email address

### Requirement: Realtime presence is scoped to the caller's community

The realtime online-user signal SHALL be delivered only to members of the same
community and SHALL describe only members of that community.

#### Scenario: Presence across communities

- **WHEN** a member of community A and a member of community B are both
  connected
- **THEN** neither one's presence data contains the other

#### Scenario: Community-less connection

- **WHEN** a user who belongs to no community connects
- **THEN** they receive no presence data for any community
- **AND** they appear in no community's presence data

### Requirement: Realtime identity is established by the server

A realtime connection's identity and community SHALL be derived from a
credential verified by the server. A client-supplied identity SHALL NOT be
trusted.

#### Scenario: Connection without a valid credential

- **WHEN** a client opens a realtime connection without a valid credential
- **THEN** the connection receives no community-scoped data

#### Scenario: Client claims another identity

- **WHEN** a connected client sends an identity or community different from the
  one in its verified credential
- **THEN** the claim is ignored and the verified values remain in effect

### Requirement: Project-wide data stays unscoped

Data that belongs to the project rather than to a community — the donation
list and the boss catalogue — SHALL remain identical for every user and SHALL
NOT be partitioned by community.

#### Scenario: Donations across communities

- **WHEN** members of different communities read the donation list
- **THEN** both receive the same content
