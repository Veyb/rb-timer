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

// A member of the fixture community holding `viewer`. The only account that
// reaches the profile screen without officer rights, and therefore the only one
// that can show the invites tab is hidden rather than the whole page being
// hidden — the two accounts above are both stopped by the gate first.
export const VIEWER_MEMBER = {
  username: 'e2e-viewer',
  email: 'e2e-viewer@rb-timer.local',
  password: 'E2eViewer!2026',
  nickname: 'E2E Viewer',
  realname: 'E2E Viewer',
};

// Redeems a code during the run, which is the point: it is the only fixture
// that changes community, so no other spec may depend on its membership. The
// setup puts it back to no community before every run.
export const JOINER_USER = {
  username: 'e2e-joiner',
  email: 'e2e-joiner@rb-timer.local',
  password: 'E2eJoiner!2026',
  nickname: 'E2E Joiner',
  realname: 'E2E Joiner',
};

// Kept in step with the default in apps/backend/scripts/e2e-fixture.js.
export const FIXTURE_COMMUNITY_NAME = 'E2E Fixture Community';

// One saved session per account. Signing in inside a test instead trips
// Strapi's rate limit on /auth/local once the suite runs files in parallel.
export const STORAGE_STATE_PATH = 'e2e/.auth/fixture-user.json';
export const NO_COMMUNITY_STORAGE_STATE_PATH = 'e2e/.auth/no-community-user.json';
export const DEFAULT_ROLE_STORAGE_STATE_PATH = 'e2e/.auth/default-role-user.json';
export const VIEWER_STORAGE_STATE_PATH = 'e2e/.auth/viewer-member.json';
export const JOINER_STORAGE_STATE_PATH = 'e2e/.auth/joiner-user.json';

export const INVALID_CREDENTIALS_TEXT = 'Указан неправильный username или пароль';
