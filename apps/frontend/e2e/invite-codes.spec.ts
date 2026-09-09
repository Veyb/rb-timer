import path from 'node:path';
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../constants/test-ids';
import { API_BASE, tokenFromSession } from './fixtures/api';
import {
  FIXTURE_USER,
  JOINER_STORAGE_STATE_PATH,
  JOINER_USER,
  STORAGE_STATE_PATH,
  VIEWER_STORAGE_STATE_PATH,
} from './fixtures/constants';
import { expect, test } from './fixtures/test';

const sessionOf = (relative: string) => path.resolve(__dirname, '..', relative);

/**
 * Presses "create" and reads the code out of the response.
 *
 * Not out of the topmost row: this suite runs against the development database,
 * which keeps every code an earlier run issued, so "the newest row" and "how
 * many rows there are" are both about the history of the machine rather than
 * about this test. The code the request just returned is not.
 */
const issueCode = async (page: Page) => {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith('/community/invite-codes') &&
        candidate.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Создать код' }).click(),
  ]);

  return ((await response.json()) as { code: string }).code;
};

const rowFor = (page: Page, code: string) =>
  page.getByTestId(TEST_IDS.profileInvites.row).filter({ hasText: code });

const openUserMenu = (page: Page) => page.getByTestId(TEST_IDS.header.userMenu).click();

test.describe('an officer of a community', () => {
  test('is offered the invitations section in the menu', async ({ page }) => {
    await page.goto('/');
    await openUserMenu(page);

    await expect(page.getByTestId(TEST_IDS.invites.menuItem)).toBeVisible();
  });

  test('the section opens on its code list', async ({ page }) => {
    await page.goto('/invites');

    await expect(page).toHaveURL('/invites/codes');
    await expect(page.getByTestId(TEST_IDS.invites.codesTab)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.invites.historyTab)).toBeVisible();
  });

  test('issues a code and sees its limit, expiry and share link', async ({ page }) => {
    await page.goto('/invites/codes');
    await expect(page.getByTestId(TEST_IDS.profileInvites.create)).toBeVisible();

    const code = await issueCode(page);
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const row = rowFor(page, code);
    await expect(row).toHaveCount(1);

    // The default preset is a single-use code with a one-day life.
    await expect(row.getByTestId(TEST_IDS.profileInvites.remaining)).toHaveText(/Осталось 1 из 1/);
    await expect(row.getByTestId(TEST_IDS.profileInvites.expires)).toHaveText(/Истекает/);
    await expect(row.getByTestId(TEST_IDS.profileInvites.status)).toHaveAttribute(
      'data-status',
      'active',
    );
    await expect(row.getByTestId(TEST_IDS.profileInvites.joinLink)).toHaveValue(
      `http://localhost:3000/join?code=${code}`,
    );
  });

  test('revokes a code and it is marked as revoked', async ({ page }) => {
    await page.goto('/invites/codes');
    await expect(page.getByTestId(TEST_IDS.profileInvites.create)).toBeVisible();

    const row = rowFor(page, await issueCode(page));

    await row.getByTestId(TEST_IDS.profileInvites.revoke).click();
    await page.getByTestId(TEST_IDS.profileManagement.confirm).click();

    await expect(row.getByTestId(TEST_IDS.profileInvites.status)).toHaveAttribute(
      'data-status',
      'revoked',
    );
    // Gone from the row it no longer applies to, rather than left there inert.
    await expect(row.getByTestId(TEST_IDS.profileInvites.revoke)).toHaveCount(0);
  });

  test('is offered no deletion at all, only revocation', async ({ page }) => {
    await page.goto('/invites/codes');
    await expect(page.getByTestId(TEST_IDS.profileInvites.create)).toBeVisible();

    const row = rowFor(page, await issueCode(page));

    await expect(row.getByTestId(TEST_IDS.profileInvites.revoke)).toBeVisible();
    await expect(row.getByRole('button', { name: 'Удалить' })).toHaveCount(0);
  });

  test('no longer finds either section in the profile', async ({ page }) => {
    await page.goto('/profile/management');

    await expect(page.getByRole('tab', { name: 'Приглашения' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'История' })).toHaveCount(0);
  });
});

test.describe('a viewer of the same community', () => {
  test.use({ storageState: sessionOf(VIEWER_STORAGE_STATE_PATH) });

  test('is offered no invitations entry in the menu', async ({ page }) => {
    await page.goto('/');
    await openUserMenu(page);

    // The menu itself opened, so the absence is about this entry rather than
    // about the whole dropdown failing to render.
    await expect(page.getByText('Пользователи')).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.invites.menuItem)).toHaveCount(0);
  });

  test('opening the section by its URL is told it is for officers', async ({ page }) => {
    await page.goto('/invites/codes');

    await expect(page.getByTestId(TEST_IDS.invites.officersOnly)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.profileInvites.create)).toHaveCount(0);
  });

  test('the history is refused the same way', async ({ page }) => {
    await page.goto('/invites/history');

    await expect(page.getByTestId(TEST_IDS.invites.officersOnly)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.inviteHistory.list)).toHaveCount(0);
  });
});

// Spends its account: it is a member of the fixture community by the end, and
// the setup puts it back before the next run. No other spec may depend on it.
test.describe('a join link', () => {
  test.use({ storageState: sessionOf(JOINER_STORAGE_STATE_PATH) });

  test('pre-fills the code it carries', async ({ page }) => {
    await page.goto('/join?code=ZZZZ-ZZZZ-ZZZZ');

    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeInput)).toHaveValue(
      'ZZZZ-ZZZZ-ZZZZ',
    );
  });

  test('joins the community when the pre-filled code is submitted', async ({ page }) => {
    // Arranged through the API rather than by driving the officer's screen: a
    // second browser session per spec is what the saved sessions exist to avoid.
    const created = await page.request.post(`${API_BASE}/community/invite-codes`, {
      headers: { Authorization: `Bearer ${tokenFromSession(STORAGE_STATE_PATH)}` },
      data: { maxUses: 1 },
    });
    expect(created.ok()).toBe(true);
    const { code } = (await created.json()) as { code: string };

    await page.goto(`/join?code=${code}`);
    await page.getByTestId(TEST_IDS.accessPlaceholder.inviteCodeSubmit).click();

    // No manual reload: submitting navigates, and the shell re-reads /users/me.
    await expect(page.getByTestId(TEST_IDS.bossList.table)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.accessPlaceholder.noCommunity)).toHaveCount(0);

    await page.goto('/profile/management');
    await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toHaveText('Наблюдатель');
  });

  test('shows the redemption to the officer who issued the code', async ({ page }) => {
    const officer = { Authorization: `Bearer ${tokenFromSession(STORAGE_STATE_PATH)}` };
    const codes = await page.request.get(`${API_BASE}/community/invite-codes`, {
      headers: officer,
    });
    const redeemed = ((await codes.json()) as { redemptions: { user: { nickname: string } }[] }[])
      .flatMap((entry) => entry.redemptions)
      .map((redemption) => redemption.user.nickname);

    expect(redeemed).toContain(JOINER_USER.nickname);
  });
});

// Runs after the join describe above, which is what puts an admission in the
// history to look at. The file is not parallel, so the order holds.
test.describe('the invite history', () => {
  test('shows who was admitted, when and on whose invitation', async ({ page }) => {
    await page.goto('/invites/history');

    const row = page
      .getByTestId(TEST_IDS.inviteHistory.row)
      .filter({ hasText: JOINER_USER.nickname });

    await expect(row).toHaveCount(1);
    await expect(row.getByTestId(TEST_IDS.inviteHistory.issuer)).toHaveText(
      `Пригласил: ${FIXTURE_USER.username}`,
    );
    await expect(row.getByTestId(TEST_IDS.inviteHistory.code)).toHaveText(
      /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    );
  });

  test('narrows to a search', async ({ page }) => {
    await page.goto('/invites/history');
    await expect(page.getByTestId(TEST_IDS.inviteHistory.row).first()).toBeVisible();

    await page.getByTestId(TEST_IDS.inviteHistory.search).fill(JOINER_USER.nickname);
    await expect(page.getByTestId(TEST_IDS.inviteHistory.row)).toHaveCount(1);

    await page.getByTestId(TEST_IDS.inviteHistory.search).fill('нет-такого-игрока');
    await expect(page.getByTestId(TEST_IDS.inviteHistory.row)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.inviteHistory.noMatches)).toBeVisible();
  });

  test('is reachable by clicking through from the code list', async ({ page }) => {
    await page.goto('/invites/codes');
    await page.getByTestId(TEST_IDS.invites.historyTab).click();

    await expect(page).toHaveURL('/invites/history');
    await expect(page.getByTestId(TEST_IDS.inviteHistory.search)).toBeVisible();
  });
});
