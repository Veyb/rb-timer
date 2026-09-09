import path from 'node:path';
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../constants/test-ids';
import { API_BASE, tokenFromSession } from './fixtures/api';
import {
  DEFAULT_ROLE_MEMBER,
  DEFAULT_ROLE_STORAGE_STATE_PATH,
  FIXTURE_USER,
  NO_COMMUNITY_STORAGE_STATE_PATH,
  STORAGE_STATE_PATH,
} from './fixtures/constants';
import { expect, test } from './fixtures/test';

/** Members are addressed by documentId, which only the API knows. */
const memberByUsername = async (page: Page, username: string) => {
  const response = await page.request.get(`${API_BASE}/community/members`, {
    headers: { Authorization: `Bearer ${tokenFromSession(STORAGE_STATE_PATH)}` },
  });
  const members = (await response.json()) as { documentId: string; username: string }[];
  const member = members.find((entry) => entry.username === username);

  if (!member) throw new Error(`No member ${username} in the fixture community`);

  return member;
};

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

test.describe('an officer following their own row in the member list', () => {
  test('lands on their own profile, not on a member page', async ({ page }) => {
    const me = await memberByUsername(page, FIXTURE_USER.username);

    await page.goto(`/users/${me.documentId}/management`);

    // The member page is built for looking at somebody else: it used to offer
    // an officer a role control and a removal control over themselves, both of
    // which the endpoints refuse by design.
    await expect(page).toHaveURL('/profile/management');
  });

  test('is offered the controls that make sense for their own account', async ({ page }) => {
    const me = await memberByUsername(page, FIXTURE_USER.username);

    await page.goto(`/users/${me.documentId}/management`);

    await expect(page.getByTestId(TEST_IDS.profileManagement.roleSelect)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.profileManagement.removeMember)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.deleteAccount)).toBeVisible();
  });
});

test.describe('an officer looking at a member on the registration default', () => {
  test('reads that role by its name, and cannot assign it back', async ({ page }) => {
    // The role an officer may assign and the role a member may hold are not the
    // same set: this one is left behind by leaving, by removal, or by an
    // operator. Without an entry of its own the control had a value with no
    // option to match it, and printed the raw `authenticated`.
    const member = await memberByUsername(page, DEFAULT_ROLE_MEMBER.username);
    await page.goto(`/users/${member.documentId}/management`);

    const select = page.getByTestId(TEST_IDS.profileManagement.roleSelect);
    await expect(select).toContainText('Бесправный');
    await expect(select).not.toContainText('authenticated');

    await select.click();
    // Present so the reader knows where the member stands, and unselectable so
    // the officer cannot put anyone back into it.
    await expect(page.getByRole('option', { name: 'Бесправный' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    for (const name of ['Наблюдатель', 'Редактор', 'Офицер']) {
      await expect(page.getByRole('option', { name })).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('can filter the member list by that role', async ({ page }) => {
    // The filter offers the roles the list contains, so a member nobody can be
    // assigned to any more is still findable.
    await page.goto('/users');
    await page.getByTestId(TEST_IDS.usersList.roleFilter).click();

    await page.getByRole('option', { name: 'Бесправный' }).click();

    // Asserted on the table rather than on the page: the nickname and the real
    // name are the same string for these fixtures, so a bare text locator
    // matches two cells.
    const table = page.getByTestId(TEST_IDS.usersList.table);
    await expect(table).toContainText(DEFAULT_ROLE_MEMBER.nickname);
    await expect(table).not.toContainText(FIXTURE_USER.nickname);
  });
});

// A member the gate refuses is shut out of every screen built on community
// data, so the placeholder carries a way out too — these are the members most
// likely to want one, and they should not have to find the profile first.
test.describe('a community member the gate refuses', () => {
  test.use({ storageState: sessionOf(DEFAULT_ROLE_STORAGE_STATE_PATH) });

  test('can leave the community from the placeholder', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noRole)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toBeVisible();
  });

  test('and from their own profile, which is not behind the gate', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toHaveText('Бесправный');
    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.deleteAccount)).toBeVisible();
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

    // The profile renders for them — that is the point — and offers nothing to
    // leave, because there is nothing to leave.
    await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileManagement.leaveCommunity)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.profileManagement.deleteAccount)).toBeVisible();
  });
});
