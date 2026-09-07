// Dedicated e2e-only account. Never touches or resembles any of the real
// migrated user accounts in apps/backend/.tmp/data.db. The password must stay
// constant across runs: Strapi returns the same generic "Invalid identifier
// or password" error for both "no such user" and "wrong password", so a
// changed password here would make the setup step try to register an
// already-taken email and fail.
export const FIXTURE_USER = {
  username: 'e2e-fixture',
  email: 'e2e-fixture@rb-timer.local',
  password: 'E2eFixture!2026',
  nickname: 'E2E Fixture',
  realname: 'E2E Fixture',
};

// The access gate turns on two independent axes, so one account per corner.
//
// Holds `viewer` but no community. Deliberately privileged: with the default
// role it would be refused for its role alone, and the test would pass
// whether or not membership is checked at all.
export const NO_COMMUNITY_USER = {
  username: 'e2e-no-community',
  email: 'e2e-no-community@rb-timer.local',
  password: 'E2eNoCommunity!2026',
  nickname: 'E2E No Community',
  realname: 'E2E No Community',
};

// The mirror image: a member of a community still on the role registration
// grants. Only an officer of that community can move it further.
export const DEFAULT_ROLE_MEMBER = {
  username: 'e2e-default-role',
  email: 'e2e-default-role@rb-timer.local',
  password: 'E2eDefaultRole!2026',
  nickname: 'E2E Default Role',
  realname: 'E2E Default Role',
};

// Kept in step with the default in apps/backend/scripts/e2e-fixture.js.
export const FIXTURE_COMMUNITY_NAME = 'E2E Fixture Community';

// One saved session per account. Signing in inside a test instead trips
// Strapi's rate limit on /auth/local once the suite runs files in parallel.
export const STORAGE_STATE_PATH = 'e2e/.auth/fixture-user.json';
export const NO_COMMUNITY_STORAGE_STATE_PATH = 'e2e/.auth/no-community-user.json';
export const DEFAULT_ROLE_STORAGE_STATE_PATH = 'e2e/.auth/default-role-user.json';

export const INVALID_CREDENTIALS_TEXT = 'Указан неправильный username или пароль';
