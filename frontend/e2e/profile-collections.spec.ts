import { TEST_IDS } from '../constants/test-ids';
import { test, expect } from './fixtures/test';

// Smoke check only: confirms the collections screen renders for an
// authenticated (officer) user. Deliberately does not interact with any
// collection item — that would mutate the real, shared dev dataset.
test('collections screen loads for an authenticated user', async ({ page }) => {
  await page.goto('/profile/collections');

  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.profileCollections.effectsBlock)).toBeVisible();
});
