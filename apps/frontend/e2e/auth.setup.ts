import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

import { TEST_IDS } from '../constants/test-ids';
import { FIXTURE_USER, STORAGE_STATE_PATH } from './fixtures/constants';
import { signInOrRegister } from './fixtures/sign-in';

const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const STORAGE_STATE_ABS_PATH = path.resolve(__dirname, '..', STORAGE_STATE_PATH);

setup('authenticate as the e2e fixture user', async ({ page }) => {
  // Sanity check, once: the login field is still reachable by its visible
  // label too, not just its test id (a lightweight accessibility signal —
  // data-testid alone wouldn't catch a form that lost its <label>).
  await page.goto('/login');
  await expect(page.getByLabel('Username или e-mail')).toBeVisible();

  await signInOrRegister(page, FIXTURE_USER);

  // Fresh registration lands on the lowest-privilege role and no community;
  // grant both directly in the database so the fixture account can reach
  // every gated screen this suite smoke-tests.
  execFileSync('pnpm', ['run', 'e2e:fixture', FIXTURE_USER.email], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  });

  // Those changes happened outside the running session; navigate to force
  // layout.tsx's server-side getCurrentUser() to refetch /users/me.
  await page.goto('/profile/management');
  await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toHaveText('Офицер');

  await page.context().storageState({ path: STORAGE_STATE_ABS_PATH });
});
