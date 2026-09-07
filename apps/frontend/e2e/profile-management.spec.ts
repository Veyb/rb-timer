import { TEST_IDS } from '../constants/test-ids';
import { expect, test } from './fixtures/test';

// Smoke check only: confirms the management screen renders, and that the
// officer-only "Удалить" button is visible (proving the fixture's role
// upgrade actually took effect). Deliberately does not click it.
test('management screen loads for an authenticated officer', async ({ page }) => {
  await page.goto('/profile/management');

  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.profileManagement.deleteButton)).toBeVisible();
});

test('the profile area opens on management', async ({ page }) => {
  await page.goto('/profile');

  await expect(page).toHaveURL('/profile/management');
  await expect(page.getByTestId(TEST_IDS.profileManagement.deleteButton)).toBeVisible();
});

// The collections section is on its way out: it must not be reachable from
// navigation, while its own URL keeps rendering (covered by
// profile-collections.spec.ts).
test('the profile navigation offers no collections entry', async ({ page }) => {
  await page.goto('/profile/management');

  await expect(page.getByRole('tab', { name: 'Управление' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Коллекции' })).toHaveCount(0);
});
