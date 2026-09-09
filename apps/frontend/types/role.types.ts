/**
 * Everything this application says about roles.
 *
 * Its own file rather than a corner of `community-member.types.ts`, because a
 * role is not a property of members alone: it also describes the caller's own
 * account, and it is what `GET /community/member-roles` returns. Folding it
 * into the member types would have `user.types.ts` import a member concept to
 * describe you.
 */

export type RoleType = 'authenticated' | 'public' | 'viewer' | 'editor' | 'officer';

/**
 * A role as this application names it: a label to show and a value to send.
 *
 * One shape for every place a role appears — another member's, your own, the
 * list an officer may assign from. They were briefly two identical interfaces
 * distinguished only by where the value came from, which is not a difference
 * the reader of a role can act on.
 *
 * Not the users-permissions plugin's record, which also carries `nb_users` —
 * how many accounts hold the role across every community in the installation —
 * and, read one at a time, the role's entire permission map. `lib/api/role.ts`
 * has the rest of that story.
 */
export interface Role {
  name: string;
  type: RoleType;
}
