import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test as setup } from '@playwright/test';

import {
  DEFAULT_ROLE_MEMBER,
  DEFAULT_ROLE_STORAGE_STATE_PATH,
  FIXTURE_COMMUNITY_NAME,
  JOINER_STORAGE_STATE_PATH,
  JOINER_USER,
  NO_COMMUNITY_STORAGE_STATE_PATH,
  NO_COMMUNITY_USER,
  VIEWER_MEMBER,
  VIEWER_STORAGE_STATE_PATH,
} from './fixtures/constants';
import { type FixtureAccount, signInOrRegister } from './fixtures/sign-in';

const BACKEND_DIR = path.resolve(__dirname, '../../backend');

/**
 * Provisions one account per corner of the access gate, so each placeholder is
 * asserted against the state it is actually meant for, and saves a session for
 * each.
 *
 * Registering has to happen here rather than in a spec: a first run registers
 * only after a login attempt fails, and that 400 is something the suite's
 * console-error guard rightly refuses to ignore. This file uses the raw
 * Playwright `test`, which carries no such guard.
 *
 * Saving the session matters too. A spec that signed in for itself would trip
 * Strapi's rate limit on `/auth/local` as soon as the suite ran files in
 * parallel — one sign-in per account per run is enough.
 */
const provision = async (
  page: Page,
  account: FixtureAccount,
  flags: string[],
  storageStatePath: string,
) => {
  await signInOrRegister(page, account, storageStatePath);

  execFileSync('pnpm', ['run', 'e2e:fixture', account.email, ...flags], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  });

  // The role and community changed outside the running session; navigate so
  // the layout refetches /users/me before the state is written.
  await page.goto('/profile/management');
  await page.context().storageState({ path: path.resolve(__dirname, '..', storageStatePath) });
};

setup('provision a user holding a role but no community', async ({ page }) => {
  // Privileged on purpose: with the default role this account would be refused
  // for its role alone, and a test could not tell whether membership is checked.
  await provision(
    page,
    NO_COMMUNITY_USER,
    ['--role=viewer', '--community=none'],
    NO_COMMUNITY_STORAGE_STATE_PATH,
  );
});

setup('provision a community member still on the default role', async ({ page }) => {
  await provision(
    page,
    DEFAULT_ROLE_MEMBER,
    ['--role=authenticated', `--community=${FIXTURE_COMMUNITY_NAME}`],
    DEFAULT_ROLE_STORAGE_STATE_PATH,
  );
});

setup('provision a viewer who belongs to the fixture community', async ({ page }) => {
  await provision(
    page,
    VIEWER_MEMBER,
    ['--role=viewer', `--community=${FIXTURE_COMMUNITY_NAME}`],
    VIEWER_STORAGE_STATE_PATH,
  );
});

setup('provision an account that will redeem a code during the run', async ({ page }) => {
  // Reset every run, because the invite spec deliberately leaves it a member of
  // the fixture community. The default role, so nothing about it is privileged
  // before the code is applied.
  await provision(
    page,
    JOINER_USER,
    ['--role=authenticated', '--community=none'],
    JOINER_STORAGE_STATE_PATH,
  );
});
