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
  profileManagement: {
    deleteButton: 'profile-management-delete-button',
  },
  profileCollections: {
    effectsBlock: 'profile-collections-effects-block',
  },
  usersList: {
    table: 'users-list-table',
  },
} as const;
