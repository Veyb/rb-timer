// Single source of truth for data-testid values, shared between application
// components (which set the attribute) and the e2e suite (which locates by
// it). Only elements actually referenced by a test get an entry here.
export const TEST_IDS = {
  loginForm: {
    identifier: 'login-identifier',
    password: 'login-password',
    submit: 'login-submit',
  },
  registerForm: {
    username: 'register-username',
    email: 'register-email',
    password: 'register-password',
    nickname: 'register-nickname',
    realname: 'register-realname',
    submit: 'register-submit',
  },
  bossList: {
    table: 'boss-list-table',
  },
  accessPlaceholder: {
    noCommunity: 'access-placeholder-no-community',
    noRole: 'access-placeholder-no-role',
    inviteCodeInput: 'access-placeholder-invite-code',
    inviteCodeSubmit: 'access-placeholder-invite-submit',
  },
  profileManagement: {
    // Your own role is shown, never editable: the role endpoint refuses a
    // self-target. So this is the suite's proof that a fixture's role took
    // effect, in place of the officer-only control it used to assert on.
    roleValue: 'profile-management-role-value',
    // Offered only on *another* member's page, and only to an officer.
    roleSelect: 'profile-management-role-select',
    leaveCommunity: 'profile-management-leave-community',
    removeMember: 'profile-management-remove-member',
    deleteAccount: 'profile-management-delete-account',
    confirm: 'profile-management-confirm',
  },
  join: {
    signInRequired: 'join-sign-in-required',
    alreadyMember: 'join-already-member',
  },
  profileInvites: {
    maxUses: 'profile-invites-max-uses',
    expiry: 'profile-invites-expiry',
    create: 'profile-invites-create',
    list: 'profile-invites-list',
    row: 'profile-invites-row',
    code: 'profile-invites-code',
    status: 'profile-invites-status',
    remaining: 'profile-invites-remaining',
    expires: 'profile-invites-expires',
    joinLink: 'profile-invites-join-link',
    copyLink: 'profile-invites-copy-link',
    redemption: 'profile-invites-redemption',
    revoke: 'profile-invites-revoke',
    empty: 'profile-invites-empty',
  },
  header: {
    // Opens the dropdown the section links live in.
    userMenu: 'header-user-menu',
  },
  // The invitations section: its own screen, reachable from the user menu and
  // only for officers.
  invites: {
    menuItem: 'menu-invites',
    officersOnly: 'invites-officers-only',
    codesTab: 'invites-codes-tab',
    historyTab: 'invites-history-tab',
  },
  inviteHistory: {
    search: 'invite-history-search',
    list: 'invite-history-list',
    row: 'invite-history-row',
    joiner: 'invite-history-joiner',
    issuer: 'invite-history-issuer',
    code: 'invite-history-code',
    moment: 'invite-history-moment',
    empty: 'invite-history-empty',
    noMatches: 'invite-history-no-matches',
  },
  profileCollections: {
    effectsBlock: 'profile-collections-effects-block',
  },
  usersList: {
    table: 'users-list-table',
    roleFilter: 'users-list-role-filter',
  },
} as const;
