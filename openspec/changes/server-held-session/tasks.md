## 1. Verify the ground first

- [ ] 1.1 Confirm Playwright can still read an `httpOnly` cookie from the browser context, and that `e2e/fixtures/api.ts` can therefore keep arranging fixtures through the API, before any of the work below depends on it
- [ ] 1.2 Write the measurement that fails today and will pass at the end — one login, then count the realtime connections the server holds for that tab — and keep it as the check for group 4

## 2. The cookie moves to the server

- [ ] 2.1 Add server actions for sign-in, registration and sign-out that call `/auth/local`, `/auth/local/register` and clear the cookie, setting it `httpOnly`, `secure` outside development, `sameSite: 'lax'`, and verify a signed-in reader's `document.cookie` no longer contains it
- [ ] 2.2 Verify an invite link followed from another origin still recognises the session — `sameSite: 'strict'` was tried before this change and breaks exactly this
- [ ] 2.3 Move the login and registration forms onto those actions, keeping the error messages they show today, and verify a wrong password still reads as it does now
- [ ] 2.4 Remove `accessToken` from `contexts/auth-context.tsx` and verify nothing in the page reads a credential any more

## 3. Reads and mutations move behind the server

- [ ] 3.1 Move every read that carries the session into a server component, passing data rather than a token, and verify no page hands a credential to a client component
- [ ] 3.2 Turn each mutation into a server action returning a result rather than throwing — profile update, role change, member removal, leaving, account deletion, code creation, revocation, redemption — and verify each screen still shows the backend's refusal and its reason
- [ ] 3.3 Delete the axios clients that only existed to sign browser requests, and verify `pnpm --filter frontend check-types` passes with no unused export left behind

## 4. The socket

- [ ] 4.1 Add a backend endpoint minting a short-lived single-use handshake ticket for the calling account, rate-limited, and verify a reused ticket and an expired ticket are both refused
- [ ] 4.2 Change `io.use()` to accept a ticket instead of a session token, keeping an anonymous connection anonymous, and verify presence is unchanged for every case the realtime tests already cover
- [ ] 4.3 Move the socket's lifecycle into the effect that knows the identity — one socket per identity, disposed on cleanup — and hand it to `online-list` and `donations` through context instead of a module import
- [ ] 4.4 Verify one tab holds one connection through a sign-in, using the measurement from 1.2; note in the code that queueing the reconnect on the shared singleton was tried, measured, and made it three
- [ ] 4.5 Verify signing out leaves no identified connection and removes the reader from presence

## 5. Verification

- [ ] 5.1 Run the backend suite, the PostgreSQL suite and the whole Playwright suite, and verify all pass
- [ ] 5.2 Attempt to read the session from the page by every route a script has — `document.cookie`, any global, any prop reaching a client component — and verify none of them yields it
- [ ] 5.3 Re-run the isolation attempts from `community-architecture/specs/community-isolation/spec.md` against the backend port directly, and verify this change moved none of them
