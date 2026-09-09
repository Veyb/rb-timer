import path from 'node:path';
import { TEST_IDS } from '../constants/test-ids';
import {
  DEFAULT_ROLE_STORAGE_STATE_PATH,
  NO_COMMUNITY_STORAGE_STATE_PATH,
} from './fixtures/constants';
import { expect, test } from './fixtures/test';

// Sessions saved by gate-fixtures.setup.ts, one per corner of the gate. Signing
// in per test instead trips Strapi's rate limit on /auth/local.
const sessionOf = (relative: string) => path.resolve(__dirname, '..', relative);

// Access needs a community AND a role above the one registration grants. One
// group per failing axis, so neither placeholder is asserted against a state
// that would have been refused for the other reason anyway.
test.describe('a role without a community', () => {
  test.use({ storageState: sessionOf(NO_COMMUNITY_STORAGE_STATE_PATH) });

  // This account holds `viewer`, so a role-only check would have let it
  // through: what refuses it here is the missing membership.
  test('is refused the boss list', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.bossList.table)).toHaveCount(0);
  });

  test('is refused the user list', async ({ page }) => {
    await page.goto('/users');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.usersList.table)).toHaveCount(0);
  });

  test('is offered a way to submit an invite code', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeInput)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeSubmit)).toBeVisible();
  });

  // A code that was never issued and one that is revoked, expired or exhausted
  // all answer the same way — the endpoint refuses them indistinguishably so a
  // code cannot be probed for the community behind it. Redeeming a real code is
  // covered in invite-codes.spec.ts, which has an account it may spend.
  test.describe('submitting a code that does not work', () => {
    // The refusal is the subject here, and Chromium logs a failed request as a
    // console error. Narrowed to that one status so the guard still holds.
    test.use({ allowedConsoleErrors: [/status of 403/] });

    test('is told so, and stays where it was', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeInput).fill('ZZZZ-ZZZZ-ZZZZ');
      await page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeSubmit).click();

      await expect(page.getByText(/Код не подошёл/i)).toBeVisible();
      await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toBeVisible();
    });
  });

  // Reach it, not merely arrive at its address. The profile is the caller's own
  // account, which they have whether or not they belong to anything — this used
  // to change the URL and show the same placeholder, so clicking "Профиль"
  // looked like it did nothing.
  test('can still reach its own profile, and it is the profile', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL('/profile/management');
    await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toHaveCount(0);
  });

  // `user-account-updates` requires this of any signed-in user, whatever role
  // they hold and whether or not they belong to a community. The backend has
  // always granted it; the screen used to be unreachable for exactly the
  // accounts the requirement names.
  test('can delete its own account', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.profileManagement.deleteAccount)).toBeVisible();
  });
});

test.describe('a community member on the default role', () => {
  test.use({ storageState: sessionOf(DEFAULT_ROLE_STORAGE_STATE_PATH) });

  // The mirror image: membership is there, the role is not, so the way out is
  // an officer rather than an invite code.
  test('is pointed at an officer rather than at an invite code', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noRole)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.bossList.table)).toHaveCount(0);
  });

  test('is offered no invite-code form', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeInput)).toHaveCount(0);
  });
});
