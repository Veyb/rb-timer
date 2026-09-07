import { TEST_IDS } from '../constants/test-ids';
import { DEFAULT_ROLE_MEMBER, NO_COMMUNITY_USER } from './fixtures/constants';
import { signInOrRegister } from './fixtures/sign-in';
import { expect, test } from './fixtures/test';

// Each account signs in for itself rather than reusing the suite's officer
// storage state, because the point here is the states the gate refuses.
test.use({ storageState: { cookies: [], origins: [] } });

// Access needs a community AND a role above the one registration grants. One
// group per failing axis, so neither placeholder is asserted against a state
// that would have been refused for the other reason anyway.
test.describe('a role without a community', () => {
  test.beforeEach(async ({ page }) => {
    await signInOrRegister(page, NO_COMMUNITY_USER);
  });

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

  // TODO(community-architecture): replace with an assertion that redeeming
  // actually joins the community once the endpoint exists (tasks.md 8.7).
  test('is told plainly that redemption is not wired up yet', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeInput).fill('SOME-CODE');
    await page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeSubmit).click();

    await expect(page.getByText(/ещё не подключён/i)).toBeVisible();
  });

  test('can still reach its own profile', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL('/profile/management');
    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toBeVisible();
  });
});

test.describe('a community member on the default role', () => {
  test.beforeEach(async ({ page }) => {
    await signInOrRegister(page, DEFAULT_ROLE_MEMBER);
  });

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
