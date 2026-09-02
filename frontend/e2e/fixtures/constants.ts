// Dedicated e2e-only account. Never touches or resembles any of the real
// migrated user accounts in backend/.tmp/data.db. The password must stay
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

export const STORAGE_STATE_PATH = 'e2e/.auth/fixture-user.json';

export const INVALID_CREDENTIALS_TEXT =
  'Указан неправильный username или пароль';
