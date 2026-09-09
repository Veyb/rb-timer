import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

import { TEST_IDS } from '../../constants/test-ids';
import { API_BASE, tokenFromSession } from './api';
import { INVALID_CREDENTIALS_TEXT } from './constants';

export interface FixtureAccount {
  username: string;
  email: string;
  password: string;
  nickname: string;
  realname: string;
}

/**
 * Strapi's own words when the rate limit on `/auth/local` is hit. Matched only
 * so a throttled run says so — see `signInOrRegister`.
 */
const TOO_MANY_REQUESTS = /too many requests/i;

/**
 * Puts a still-valid saved session back on the page instead of signing in
 * again.
 *
 * `/auth/local` is rate-limited to five requests per five minutes, and the key
 * for that route is the client address alone — the plugin deliberately leaves
 * the identifier out of it, so every fixture account shares one bucket. With
 * five accounts to provision, a run signing each of them in sits exactly on the
 * ceiling: observed failing on roughly one run in four, and only when no
 * backend reload had cleared the in-process counter in between. Reusing a
 * session that still works takes a repeat run down to no logins at all.
 */
const reuseSession = async (page: Page, storageStatePath: string) => {
  const file = path.resolve(__dirname, '../..', storageStatePath);
  if (!existsSync(file)) return false;

  let token: string;
  try {
    token = tokenFromSession(storageStatePath);
  } catch {
    return false;
  }

  const response = await page.request.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });

  if (!response.ok()) return false;

  // An origin has to exist before a cookie can be set against it. The page is
  // signed out at this point; the caller navigates again once provisioning is
  // done, which is what the saved state is taken from.
  await page.goto('/');
  await page.context().addCookies([
    {
      name: 'jwt',
      value: token,
      url: new URL(page.url()).origin,
    },
  ]);

  return true;
};

/**
 * Signs the account in, registering it first if this database has never seen
 * it. Strapi answers with the same generic "invalid identifier or password"
 * for an unknown user and a wrong password, so a failed login is the only
 * signal that the account is missing — which is why fixture passwords must
 * stay constant across runs.
 *
 * A saved session that still works is used instead, when there is one.
 */
export async function signInOrRegister(
  page: Page,
  account: FixtureAccount,
  storageStatePath?: string,
): Promise<void> {
  if (storageStatePath && (await reuseSession(page, storageStatePath))) return;

  await page.goto('/login');

  await page.getByTestId(TEST_IDS.loginForm.identifier).fill(account.email);
  await page.getByTestId(TEST_IDS.loginForm.password).fill(account.password);
  await page.getByTestId(TEST_IDS.loginForm.submit).click();

  await Promise.race([
    page.waitForURL('/'),
    page.getByText(INVALID_CREDENTIALS_TEXT).waitFor({ state: 'visible' }),
    // Without this the throttled case matches neither of the two above and the
    // step dies on a navigation timeout, which says nothing about the cause.
    page
      .getByText(TOO_MANY_REQUESTS)
      .waitFor({ state: 'visible' })
      .then(() => {
        throw new Error(
          `Rate-limited signing in as ${account.email}. /auth/local allows five requests per five ` +
            'minutes per client address, shared across every account. Wait for the window to pass.',
        );
      }),
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
