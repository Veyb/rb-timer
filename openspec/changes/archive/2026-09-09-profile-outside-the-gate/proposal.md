## Why

A user with no community clicked "Профиль" in the menu, watched the address
change to `/profile/management`, and was shown the same placeholder they were
already looking at. The entry appeared to do nothing.

The gate had been applied to the profile area, and the profile area is not a
functional screen — it is the caller's own account, which they have whether or
not they belong to anything. `community-membership-gate` already said the gate
covers "functional screens" and that a placeholder "replaces functional
content, not the shell", but neither phrase was pinned down, and the
implementation read them the other way.

That cost more than a confusing click. `user-account-updates` requires that
"any signed-in user SHALL be able to delete their own account, whatever role
they hold and whether or not they belong to a community", with a scenario
naming the community-less case. The backend honours it — `deleteMe` is granted
to the role registration hands out. The control lives on the profile, so the
requirement was met at the API and broken in the product for exactly the
accounts it names.

The code is already corrected. This records the decision in the specs, and
sharpens the two places whose looseness let the bug pass a scenario that was
written to catch it.

## What Changes

- The gate's scope is stated: it covers screens built on a community's data,
  and the profile area is named as being outside it.
- The scenario "Placeholder replaces functional content, not the shell" stops
  accepting an address change as evidence. Reaching the profile means the
  profile renders.
- `profile-navigation` gains a requirement that the profile area is available
  to any signed-in user, and that what it offers varies by what the caller has
  rather than by whether they are let in.

## Impact

- Affected specs: `community-membership-gate`, `profile-navigation`
- Affected code: none outstanding — `components/profile-content` was corrected
  in c6e8838, along with three e2e tests that had encoded the old behaviour
