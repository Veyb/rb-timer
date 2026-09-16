## REMOVED Requirements

### Requirement: The item collection section is withdrawn from navigation

**Reason**: The requirement kept the item collection route resolving after it
left navigation, so that existing links would not break. That was a grace
period, and it ends here: the `Collection`, `Item` and `Effect` collection types
the section reads are removed by this change, so there is nothing left for the
route to render. A route that resolves to an error is worse than one that is
gone.

**Migration**: The route and the components behind it are deleted along with the
data. A visitor following an old `/profile/collections` link reaches the
application's not-found response. No user data is lost that the product still
surfaces — the section has been unreachable from navigation since
`profile-navigation` was introduced, and the collection records it displayed are
removed with it. Nothing replaces the feature; the item catalogue introduced by
`raid-boss-catalog` is game reference data, not a record of what a user owns.
