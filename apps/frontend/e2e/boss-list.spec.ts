import { TEST_IDS } from '../constants/test-ids';
import { test, expect } from './fixtures/test';

test('boss list loads for an authenticated user', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId(TEST_IDS.bossList.table)).toBeVisible();
});
