## 1. Correct the behaviour

- [x] 1.1 Stop gating `components/profile-content` on community membership, and verify a user with no community sees their own account details rather than the placeholder
- [x] 1.2 Verify the account-deletion control is reachable for a user with no community, which `user-account-updates` requires and the backend already permits
- [x] 1.3 Verify a member the gate refuses can leave their community from the profile as well as from the placeholder, and that a user with no community is offered nothing to leave
- [x] 1.4 Rewrite the three e2e tests that asserted the placeholder on `/profile/management`, and verify restoring the gate fails them
