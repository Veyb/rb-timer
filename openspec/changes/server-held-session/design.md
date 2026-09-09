## Context

The frontend is a Next.js App Router application talking to a self-hosted
Strapi on another port. Today the browser is the client: it holds the JWT, sets
`Authorization` on every axios call, and opens the socket. The Next server is
used for rendering and, since `lib/dal.ts`, for reading the caller — but never
as the thing that talks to the API on the reader's behalf.

Two measurements frame this change, both taken against a running instance
rather than reasoned about.

The cookie, read from the page after signing in:

```
document.cookie contains jwt: true
httpOnly: false | secure: false (development) | sameSite: Lax
```

And one login, as the server saw it — two authenticated sockets for one tab,
persisting at 3, 10 and 30 seconds:

```
connect    id=PVDJ… community=2    presence=E2E Fixture
connect    id=Goh5… community=null presence=anon
disconnect id=Goh5… reason=client namespace disconnect
connect    id=qG-a… community=2    presence=E2E Fixture
```

## Goals / Non-Goals

Goals:

- The session credential is never available to JavaScript running in the page.
- One browser tab holds one socket connection.
- The isolation rules are untouched. This changes who holds the credential.

Non-Goals:

- Rewriting the UI as server components. Most of the app is a client tree
  behind `AuthContextProvider`; that is worth revisiting and is not this.
- Refresh tokens, session revocation lists, or a session store. The token stays
  the plugin's JWT with the plugin's lifetime.
- Anything about the Strapi admin panel's own session.

## Decisions

### Decision 1: The cookie is written by the server, and the browser stops seeing it

Sign-in, registration and sign-out become server actions. The action calls
`/auth/local`, receives the JWT, and sets the cookie with `httpOnly`, `secure`
outside development, and `sameSite: 'lax'`.

*Why not `sameSite: 'strict'`:* it withholds the cookie on cross-site
navigation, and an invite link is exactly that — followed from a chat message.
A signed-in member opening `/join?code=…` would be served the page as a
stranger. This was tried and reverted before the change; the constraint is
recorded here so it is not tried again.

*Consequence:* `contexts/auth-context.tsx` stops holding `accessToken`. What it
still holds — the user and the derived gate flags — comes from the server on
every render, which it already does.

### Decision 2: Reads move to server components, mutations to server actions

Reads mostly already happen in pages; what they do afterwards is hand the token
to a client component. That stops. A client component that needs data receives
the data.

Mutations — updating a profile, changing a role, redeeming a code, issuing and
revoking codes, leaving, removing, deleting an account — become server actions
that read the cookie themselves.

*Alternative considered:* a catch-all route handler on the Next side proxying
to Strapi, so the axios clients keep working with the cookie attached. Rejected:
it keeps a general-purpose forwarder in the app whose job is to pass along
whatever it is given, which is the shape of thing this codebase has spent the
whole community change removing.

### Decision 3: The socket gets a ticket, not the session

The handshake needs a credential and cannot use an `httpOnly` cookie set on the
frontend's origin, because the socket connects to the backend's origin.

A server action mints a short-lived, single-use ticket — a signed value naming
the user, valid for seconds, redeemable once. `connectSocket` carries the
ticket; `io.use()` exchanges it for the identity and refuses a reused or expired
one.

*Why this is worth doing rather than leaving the token in JS for the socket's
sake:* a stolen ticket is worth one connection for a few seconds, against a
stolen session's thirty days of full API access.

*Alternatives considered:*

- *Same-origin socket through the Next server.* Would let the `httpOnly` cookie
  reach the handshake, but puts a websocket proxy in the rendering server.
- *A cookie on the backend's origin.* The backend would have to set it, which
  means the sign-in call goes to the backend from the browser — the thing being
  removed — and it makes the two origins share a cookie scope.

### Decision 4: The socket's lifecycle belongs to the effect

`lib/web-sockets.ts` exports one module-level socket and `connectSocket`
reconnects it in place. That is what produces the duplicate: the anonymous
connection and the authenticated one race, and `disconnect()` followed by
`connect()` in the same tick does not sequence them.

*Recorded so it is not repeated:* the obvious one-line fix — queueing the
reconnect with `socket.once('disconnect', …)` — was tried and measured. It made
it **worse**, three connections instead of two, because the queued reconnect
fires after a close that the new connection has already replaced.

The fix is structural: create the socket inside the effect that knows the
identity, dispose it in the cleanup, and pass it down through context. One
identity, one socket, disposed when the identity changes. This is also what
makes the component correct under React Strict Mode's double invocation, which
is now on.

## Risks / Trade-offs

- **Every mutation path changes at once.** Server actions are a different error
  channel from axios: the components that render a backend message today
  (`ManagementBlock`, `NoCommunityBlock`, `InvitesBlock`) need the action to
  return a result rather than throw.
- **The e2e suite arranges fixtures with the token from the storage state.**
  `e2e/fixtures/api.ts` reads the `jwt` cookie and calls the API directly. With
  an `httpOnly` cookie Playwright can still read it from the context — the
  restriction is on page JavaScript, not on the driver — so this is expected to
  keep working, but it must be verified early rather than at the end.
- **A ticket endpoint is a new unauthenticated-ish surface.** It is called by a
  signed-in caller and mints something weaker than what the caller already
  holds, so it grants nothing new; it still needs a rate limit, like redemption.
- **The socket rewrite touches presence**, which is the one feature with no way
  to verify by reading — the existing realtime tests and a measurement of the
  connection count are the check.
