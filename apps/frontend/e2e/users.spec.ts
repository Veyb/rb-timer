import { TEST_IDS } from '../constants/test-ids';
import { test, expect } from './fixtures/test';

// Smoke check only: confirms the user management list renders. Deliberately
// does not click into any row (each row links to a real user's detail page
// and, for an officer, allows edits) — this suite never touches real users.
test('users list loads for an authenticated user', async ({ page }) => {
  await page.goto('/users');

  await expect(page.getByTestId(TEST_IDS.usersList.table)).toBeVisible();
});
