import type { Page } from '@playwright/test';

import { TEST_IDS } from '../../constants/test-ids';
import { INVALID_CREDENTIALS_TEXT } from './constants';

export interface FixtureAccount {
  username: string;
  email: string;
  password: string;
  nickname: string;
  realname: string;
}

/**
 * Signs the account in, registering it first if this data.db has never seen
 * it. Strapi answers with the same generic "invalid identifier or password"
 * for an unknown user and a wrong password, so a failed login is the only
 * signal that the account is missing — which is why fixture passwords must
 * stay constant across runs.
 */
export async function signInOrRegister(page: Page, account: FixtureAccount): Promise<void> {
  await page.goto('/login');

  await page.getByTestId(TEST_IDS.loginForm.identifier).fill(account.email);
  await page.getByTestId(TEST_IDS.loginForm.password).fill(account.password);
  await page.getByTestId(TEST_IDS.loginForm.submit).click();

  await Promise.race([
    page.waitForURL('/'),
    page.getByText(INVALID_CREDENTIALS_TEXT).waitFor({ state: 'visible' }),
  ]);

  if (page.url().endsWith('/')) return;

  await page.goto('/register');
  await page.getByTestId(TEST_IDS.registerForm.username).fill(account.username);
  await page.getByTestId(TEST_IDS.registerForm.email).fill(account.email);
  await page.getByTestId(TEST_IDS.registerForm.password).fill(account.password);
  await page.getByTestId(TEST_IDS.registerForm.nickname).fill(account.nickname);
  await page.getByTestId(TEST_IDS.registerForm.realname).fill(account.realname);
  await page.getByTestId(TEST_IDS.registerForm.submit).click();
  await page.waitForURL('/');
}
