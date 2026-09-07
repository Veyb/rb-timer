import path from 'node:path';
import { TEST_IDS } from '../constants/test-ids';
import {
  DEFAULT_ROLE_STORAGE_STATE_PATH,
  NO_COMMUNITY_STORAGE_STATE_PATH,
} from './fixtures/constants';
import { expect, test } from './fixtures/test';

// Which controls the management screen offers depends on whose account it is
// and what the caller may do. None of these tests confirms a destructive
// action — the suite would be deleting its own fixtures.
const sessionOf = (relative: string) => path.resolve(__dirname, '..', relative);

test.describe('the officer fixture on its own profile', () => {
  test('is offered leaving and account deletion, but not role editing', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.deleteAccount)).toBeVisible();

    // The role endpoint refuses a self-target, so the control is absent rather
    // than present and failing.
    await expect(page.getByTestId(TEST_IDS.profileManagement.roleSelect)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toHaveText('Офицер');
  });

  test('is not offered a removal control for itself', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.profileManagement.removeMember)).toHaveCount(0);
  });

  test('asks for confirmation before leaving', async ({ page }) => {
    await page.goto('/profile/management');
    await page.getByTestId(TEST_IDS.profileManagement.leaveCommunity).click();

    await expect(page.getByText('Выход из сообщества')).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.confirm)).toBeVisible();
  });

  test('asks for confirmation before deleting the account', async ({ page }) => {
    await page.goto('/profile/management');
    await page.getByTestId(TEST_IDS.profileManagement.deleteAccount).click();

    await expect(page.getByText('безвозвратно')).toBeVisible();
  });
});

// A member the gate refuses never reaches the management screen, so the
// placeholder is the only place a way out can live — and these are the members
// most likely to want one.
test.describe('a community member the gate refuses', () => {
  test.use({ storageState: sessionOf(DEFAULT_ROLE_STORAGE_STATE_PATH) });

  test('can still leave the community from the placeholder', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noRole)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toBeVisible();
  });

  test('is offered nothing that administers anyone else', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.profileManagement.roleSelect)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.profileManagement.removeMember)).toHaveCount(0);
  });
});

test.describe('a user who belongs to no community', () => {
  test.use({ storageState: sessionOf(NO_COMMUNITY_STORAGE_STATE_PATH) });

  test('has no community to leave', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toHaveCount(0);
  });
});
