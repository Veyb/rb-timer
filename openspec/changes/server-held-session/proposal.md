## Why

The session token is readable by any script on the page. Measured on a running
instance, immediately after signing in:

```
document.cookie contains jwt: true
httpOnly: false | secure: false (development) | sameSite: Lax
```

It is not an oversight. `contexts/auth-context.tsx` writes the cookie from the
browser with `nookies`, and a cookie written from the browser cannot be
`httpOnly`; the client then reads it back to put `Authorization: Bearer` on
every request axios makes. One cross-site scripting hole anywhere in the app —
or in any of its dependencies — hands an attacker a thirty-day session for
whoever is looking at the page, including an officer.

This matters more now than it did before the community rework. That change
spent its whole effort making the backend refuse cross-community reads to a
caller who is not entitled to them. All of it is enforced against the caller's
token, so a stolen token is a stolen community: the member list, the invite
codes, the record of who admitted whom, and the power to change roles and
remove people.

The same area holds a second defect, found while measuring the first. Logging
in leaves **two** authenticated socket connections for one browser tab. From
the server, one login:

```
connect    id=PVDJ… community=2    presence=E2E Fixture
connect    id=Goh5… community=null presence=anon
disconnect id=Goh5… reason=client namespace disconnect
connect    id=qG-a… community=2    presence=E2E Fixture
```

Both authenticated connections persist — checked at 3, 10 and 30 seconds — and
a second tab, which is served a presence map the server recomputes as it joins,
sees the first tab twice. A member with one tab open is shown to their
community as having two.

The two belong in one change because they are the same knot. The socket is the
reason the token has to be readable from JavaScript: `connectSocket(token)`
puts it in the handshake, and unlike the REST calls there is no server in
between to hold it. Any fix for the cookie has to answer for the socket, and
the socket's lifecycle is what has to be rewritten to stop the duplicate.

## What Changes

- **BREAKING** — The session cookie becomes `httpOnly`, written by the server
  rather than by the browser. Sign-in, registration and sign-out become server
  actions.
- **BREAKING** — Reads and mutations that carry the session stop being made
  from the browser. Reads move into server components, which already hold the
  token through `lib/dal.ts`; mutations become server actions.
- The socket stops receiving the session token. It is handed a short-lived,
  single-use ticket minted by the server for one handshake.
- The socket's lifecycle moves into the effect that owns it: one connection per
  identity, disposed on teardown, instead of a module-level singleton
  reconnected in place. `components/header/online-list` and
  `components/header/donations` receive it through context rather than by
  importing the module.
- `proxy.ts` keeps working unchanged: it already reads the cookie server-side.

## Impact

- Affected specs: `session` (new)
- Affected code: `contexts/auth-context.tsx`, `lib/api/*`, `lib/dal.ts`,
  `lib/web-sockets.ts`, `components/header/*`, every page that passes a token
  to a client component, `apps/backend/src/helpers/realtime.ts`, and a new
  ticket endpoint on the backend
- Affected tests: the e2e suite signs in through the UI and reads the `jwt`
  cookie out of the saved storage state to arrange fixtures
  (`e2e/fixtures/api.ts`); both change shape
- Not affected: the isolation guarantees themselves. Every check stays where it
  is — this changes who holds the credential, not what it permits
