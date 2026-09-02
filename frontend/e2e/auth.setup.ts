import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test as setup, expect } from '@playwright/test';

import { TEST_IDS } from '../constants/test-ids';
import { FIXTURE_USER, STORAGE_STATE_PATH, INVALID_CREDENTIALS_TEXT } from './fixtures/constants';

const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const STORAGE_STATE_ABS_PATH = path.resolve(__dirname, '..', STORAGE_STATE_PATH);

setup('authenticate as the e2e fixture user', async ({ page }) => {
  await page.goto('/login');

  // Sanity check, once: the login field is still reachable by its visible
  // label too, not just its test id (a lightweight accessibility signal —
  // data-testid alone wouldn't catch a form that lost its <label>).
  await expect(page.getByLabel('Username или e-mail')).toBeVisible();

  await page.getByTestId(TEST_IDS.loginForm.identifier).fill(FIXTURE_USER.email);
  await page.getByTestId(TEST_IDS.loginForm.password).fill(FIXTURE_USER.password);
  await page.getByTestId(TEST_IDS.loginForm.submit).click();

  await Promise.race([
    page.waitForURL('/'),
    page.getByText(INVALID_CREDENTIALS_TEXT).waitFor({ state: 'visible' }),
  ]);

  const loginSucceeded = page.url().endsWith('/');

  if (!loginSucceeded) {
    // Fixture user doesn't exist yet on this data.db — register it once.
    await page.goto('/register');
    await page.getByTestId(TEST_IDS.registerForm.username).fill(FIXTURE_USER.username);
    await page.getByTestId(TEST_IDS.registerForm.email).fill(FIXTURE_USER.email);
    await page.getByTestId(TEST_IDS.registerForm.password).fill(FIXTURE_USER.password);
    await page.getByTestId(TEST_IDS.registerForm.nickname).fill(FIXTURE_USER.nickname);
    await page.getByTestId(TEST_IDS.registerForm.realname).fill(FIXTURE_USER.realname);
    await page.getByTestId(TEST_IDS.registerForm.submit).click();
    await page.waitForURL('/');
  }

  // Fresh registration lands on the lowest-privilege role; upgrade it
  // directly in the database so the fixture account can reach every
  // role-gated screen this suite smoke-tests.
  execFileSync(
    'pnpm',
    ['run', 'e2e:fixture-role', FIXTURE_USER.email],
    { cwd: BACKEND_DIR, stdio: 'inherit' }
  );

  // The role change happened outside the running session; navigate to force
  // layout.tsx's server-side getCurrentUser() to refetch /users/me.
  await page.goto('/profile/management');
  await expect(page.getByTestId(TEST_IDS.profileManagement.deleteButton)).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE_ABS_PATH });
});
