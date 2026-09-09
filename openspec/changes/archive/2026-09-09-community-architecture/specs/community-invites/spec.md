## Purpose

Lets officers admit new players into their community without operator
involvement, by issuing codes that carry a limited number of uses and a limited
lifetime.

## ADDED Requirements

### Requirement: A community-scoped address means a community-scoped answer

Every endpoint whose answer is confined to the caller's own community SHALL
live under a `/community/` path, and the community SHALL be taken from the
caller's credentials rather than from the address — the prefix is a claim about
the answer, not a parameter in the request.

Redemption SHALL be the exception and SHALL sit outside that prefix, because it
acts on a code belonging to a community the caller does not yet belong to.

#### Scenario: Issuing, listing and revoking are community-scoped addresses

- **WHEN** an officer issues, lists or revokes an invite code
- **THEN** the address used is under `/community/`
- **AND** it carries no community identifier

#### Scenario: Redemption is not

- **WHEN** a community-less user redeems a code
- **THEN** the address used is outside `/community/`

### Requirement: An officer issues invite codes for their own community

An officer SHALL be able to create an invite code bound to their own community.
The bound community SHALL be derived from the officer's own membership and SHALL
NOT be taken from the request.

#### Scenario: Officer creates a code

- **WHEN** an officer of community A creates an invite code
- **THEN** a code bound to community A is returned

#### Scenario: Officer names another community

- **WHEN** an officer of community A creates an invite code while naming
  community B in the request
- **THEN** the request is refused as carrying a field the endpoint does not
  accept
- **AND** no code bound to community B exists

#### Scenario: Non-officer creates a code

- **WHEN** a user holding `viewer` or `editor`, or a user with no community,
  attempts to create an invite code
- **THEN** the attempt is refused
- **AND** no code is created

### Requirement: Requests carry only what the endpoint accepts

The create and redeem endpoints SHALL accept an explicit set of fields and
SHALL refuse a request carrying anything else, rather than ignoring the extra
field. A privileged value that a request has no business setting — the bound
community, the granted role — SHALL therefore be reported as a refusal rather
than silently dropped, so a defect and an attempt look the same from the
outside and neither passes unnoticed.

#### Scenario: Create request carries an unknown field

- **WHEN** an officer creates an invite code with a field outside the use limit
  and the expiry
- **THEN** the request is refused and no code is created

#### Scenario: Redeem request carries an unknown field

- **WHEN** a user redeems a code with a field outside the code itself
- **THEN** the request is refused and nothing about the caller changes

### Requirement: An invite code carries a use limit and an expiry

An invite code SHALL carry a maximum number of uses and an optional expiry
moment. A limit of one SHALL make the code single-use; an absent limit SHALL make
it unlimited; an absent expiry SHALL make it non-expiring.

#### Scenario: Single-use code is exhausted

- **WHEN** a code whose limit is one use is redeemed successfully
- **THEN** a second redemption of that code is refused as exhausted

#### Scenario: Multi-use code within its limit

- **WHEN** a code whose limit is five uses has been redeemed twice
- **THEN** a third redemption succeeds

#### Scenario: Expired code

- **WHEN** a code whose expiry moment has passed is redeemed
- **THEN** the redemption is refused as expired

#### Scenario: Use limit below one is rejected

- **WHEN** an officer creates a code with a use limit below one
- **THEN** the request is rejected with a validation error

### Requirement: An invite code grants the viewer role

Redeeming an invite code SHALL make the redeemer a member of the code's
community and SHALL set their role to `viewer`. Higher roles SHALL NOT be
obtainable through an invite code.

#### Scenario: Successful redemption

- **WHEN** a user who belongs to no community redeems a valid code bound to
  community A
- **THEN** the user is a member of community A
- **AND** the user holds the `viewer` role

#### Scenario: Request asks for a higher role

- **WHEN** a redemption request names a role other than `viewer`
- **THEN** the request is refused as carrying a field the endpoint does not
  accept
- **AND** the caller's role and membership are unchanged

### Requirement: Only community-less users may redeem a code

Redemption SHALL be refused for a user who already belongs to a community.
Moving between communities SHALL require an operator, or the user leaving their
current community first.

#### Scenario: Existing member redeems a code

- **WHEN** a user who already belongs to community A redeems a code bound to
  community B
- **THEN** the redemption is refused
- **AND** the user remains a member of community A with an unchanged role

#### Scenario: Unauthenticated redemption

- **WHEN** an unauthenticated client attempts to redeem a code
- **THEN** the attempt is refused

### Requirement: Redemption is atomic against concurrent attempts

Concurrent redemptions of the same code SHALL NOT admit more users than the
code's use limit permits.

#### Scenario: Two simultaneous redemptions of a single-use code

- **WHEN** two community-less users redeem the same single-use code at the same
  moment
- **THEN** exactly one redemption succeeds
- **AND** the other is refused as exhausted

### Requirement: Invalid and unknown codes are refused indistinguishably

An unknown, revoked, expired, or exhausted code SHALL be refused without
revealing which community, if any, a submitted code belongs to.

#### Scenario: Unknown code

- **WHEN** a user redeems a code that was never issued
- **THEN** the redemption is refused
- **AND** the response discloses no community

#### Scenario: Revoked code

- **WHEN** a user redeems a code that an officer has revoked
- **THEN** the redemption is refused

### Requirement: Codes resist guessing

An invite code SHALL be generated with enough randomness that it cannot be found
by guessing, and redemption attempts SHALL be rate-limited per client.

#### Scenario: Repeated failed redemptions

- **WHEN** a client submits many invalid codes in quick succession
- **THEN** further attempts from that client are throttled

### Requirement: An officer manages the codes of their own community

An officer SHALL be able to list and revoke the invite codes of their own
community, and SHALL NOT be able to see or revoke codes of any other community.

Revoking SHALL stop a code working and SHALL keep the code and its redemption
records. No API SHALL offer an officer any way to delete either. An officer who
could remove a code could admit whoever they liked and leave no trace of it,
not even of which account issued the code; removing a row is an operator's act
from the admin panel.

#### Scenario: Officer lists own codes

- **WHEN** an officer of community A lists invite codes
- **THEN** the response contains codes bound to community A only

#### Scenario: Officer revokes own code

- **WHEN** an officer of community A revokes a code bound to community A
- **THEN** the code can no longer be redeemed
- **AND** the code and its redemption records remain visible to that officer

#### Scenario: Officer revokes a foreign code

- **WHEN** an officer of community A attempts to revoke a code bound to
  community B
- **THEN** the attempt is refused
- **AND** the code remains redeemable

#### Scenario: Officer attempts to delete a code

- **WHEN** an officer attempts to delete an invite code of their own community
- **THEN** the attempt does not succeed
- **AND** the code and its redemption records are still there

### Requirement: Redemptions are attributable

Each successful redemption SHALL record which code was used, by which user, and
when, and an officer SHALL be able to see that record for codes of their own
community.

#### Scenario: Officer reviews a code's use

- **WHEN** an officer of community A inspects a code of community A that has
  been redeemed
- **THEN** the redeeming users and the moments of redemption are shown

#### Scenario: Remaining uses are visible

- **WHEN** an officer lists invite codes of their own community
- **THEN** each entry shows how many uses remain and when it expires

### Requirement: The record of an admission outlives what it refers to

A redemption record SHALL carry, alongside its relations, a copy taken at the
moment of the admission of the code used, the name of the account that issued
it and the name of the account that used it, and SHALL be bound to the joined
community directly rather than only through the code.

The record SHALL therefore remain complete and findable after the code is
deleted, after either account is deleted, or both. Nothing in the Content API
SHALL write or delete these records except the redemption endpoint itself.

An officer SHALL be able to read the admissions into their own community, and
SHALL NOT be able to read those of any other community. The record SHALL
disclose no e-mail address.

#### Scenario: Officer reviews how members were admitted

- **WHEN** an officer of community A reads the invite history
- **THEN** every admission into community A is listed with who was admitted,
  when, and the name of the account that invited them

#### Scenario: The code has been deleted

- **WHEN** an operator deletes an invite code of community A that has been used
- **THEN** the admissions it made are still listed with the code and both names

#### Scenario: The admitted account has been deleted

- **WHEN** an account admitted by a code deletes itself
- **THEN** the admission is still listed with the name that account used

#### Scenario: Foreign admissions are not shown

- **WHEN** an officer of community A reads the invite history
- **THEN** no admission into community B appears, whatever its code

#### Scenario: A member who is not an officer

- **WHEN** a `viewer` or an `editor` of community A reads the invite history
- **THEN** the attempt is refused
