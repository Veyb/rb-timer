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
