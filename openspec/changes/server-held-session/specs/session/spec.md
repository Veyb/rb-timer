## Purpose

Defines where the session credential lives and what may hold it, so that a
script running in the page cannot take over an account, and so that one browser
tab is one connection.

## ADDED Requirements

### Requirement: The session credential is not available to the page

The session cookie SHALL be written by the server with `httpOnly`, and SHALL be
`secure` outside development. No script running in the page SHALL be able to
read it, and no credential equivalent to it SHALL be held anywhere the page can
reach.

#### Scenario: A script asks for the cookie

- **WHEN** a signed-in reader's page reads `document.cookie`
- **THEN** the session cookie is not among the values returned

#### Scenario: The session still identifies the reader

- **WHEN** a signed-in reader opens any gated screen
- **THEN** it renders for them as their role and community allow

#### Scenario: Served over plain http in development

- **WHEN** the application runs in development over http
- **THEN** the cookie is still set, without the `secure` attribute

### Requirement: An invite link still recognises a session

The session cookie SHALL be sent on a top-level navigation arriving from
another site, so that an invite link followed from elsewhere reaches a signed-in
reader as themselves.

#### Scenario: Following an invite link from outside the application

- **WHEN** a signed-in member opens an invite link from another site
- **THEN** the page recognises their session
- **AND** they are not asked to sign in

### Requirement: The credential leaves the server only as the reader's own data

Requests carrying the session SHALL be made by the server. A component running
in the page SHALL receive the data it needs, and SHALL NOT receive the
credential that fetched it.

#### Scenario: A screen renders data from the API

- **WHEN** a gated screen renders
- **THEN** no session credential appears in what is sent to the page

#### Scenario: A reader performs an action

- **WHEN** a reader changes a role, redeems a code, revokes a code, leaves a
  community, removes a member, or deletes their own account
- **THEN** the request is made by the server on their behalf
- **AND** the outcome, including a refusal and its reason, is shown to them

### Requirement: The realtime connection is authorised by a ticket, not by the session

The realtime handshake SHALL be authorised by a short-lived, single-use ticket
issued by the server for that handshake. The session credential SHALL NOT be
used for it.

#### Scenario: A signed-in reader connects

- **WHEN** a signed-in reader's page opens the realtime connection
- **THEN** the server resolves their identity and community from the ticket
- **AND** presence behaves exactly as it does for a session-authorised
  connection today

#### Scenario: A ticket is used twice

- **WHEN** a ticket that has already authorised a handshake is presented again
- **THEN** the connection is refused

#### Scenario: A ticket has expired

- **WHEN** a ticket older than its lifetime is presented
- **THEN** the connection is refused

#### Scenario: An anonymous visitor connects

- **WHEN** a visitor who is not signed in opens the realtime connection
- **THEN** the connection is accepted without an identity
- **AND** it appears in no community's presence

### Requirement: One tab holds one connection

A browser tab SHALL hold exactly one realtime connection, whatever transitions
its identity goes through.

#### Scenario: Signing in

- **WHEN** a visitor signs in and the identity on the connection changes
- **THEN** the tab holds one connection, and the previous one is closed

#### Scenario: Presence counts the tab once

- **WHEN** another member of the same community reads presence recomputed by
  the server
- **THEN** a member with one tab open appears once

#### Scenario: Signing out

- **WHEN** a reader signs out
- **THEN** the tab holds no identified connection
- **AND** they appear in no community's presence
