import { TEST_IDS } from '../constants/test-ids';
import { expect, test } from './fixtures/test';

// Smoke check only: confirms the management screen renders, and that the
// role reads as officer (proving the fixture's role upgrade actually
// took effect). Your own role is never editable here.
test('management screen loads for an authenticated officer', async ({ page }) => {
  await page.goto('/profile/management');

  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toHaveText('Офицер');
});

test('the profile area opens on management', async ({ page }) => {
  await page.goto('/profile');

  await expect(page).toHaveURL('/profile/management');
  await expect(page.getByTestId(TEST_IDS.profileManagement.roleValue)).toHaveText('Офицер');
});

// The collections section is gone, not merely hidden: neither the tab nor its
// route exists any more.
test('the profile navigation offers no collections entry', async ({ page }) => {
  await page.goto('/profile/management');

  await expect(page.getByRole('tab', { name: 'Управление' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Коллекции' })).toHaveCount(0);
});

// Asserts the page a visitor reaches, not the status code. `notFound()` raised
// from inside a matched dynamic segment renders the not-found page but answers
// 200 — `/profile/nonsense` does the same, and did before the collections route
// was removed. Only a URL that matches no route at all answers 404.
test('the collections route no longer resolves', async ({ page }) => {
  await page.goto('/profile/collections');

  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Коллекции' })).toHaveCount(0);
});
