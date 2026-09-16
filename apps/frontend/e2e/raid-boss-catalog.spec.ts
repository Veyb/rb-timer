import { expect, test } from './fixtures/test';

// The catalogue is the first screen in this application readable without an
// account, so the thing worth asserting is the absence of a session rather than
// the presence of a table. Every other spec runs with the fixture user's
// storage state; this one throws it away, which is what makes the test mean
// anything — with a token in the jar it would pass whether or not the public
// role held a single permission.
test.use({ storageState: { cookies: [], origins: [] } });

test('a visitor with no account reads the raid-boss catalogue', async ({ page }) => {
  await page.goto('/raid-bosses');

  await expect(page).toHaveURL(/\/raid-bosses$/);
  await expect(page.getByRole('heading', { name: 'Рейдовые боссы' })).toBeVisible();

  // Rows, not just a heading: an empty table would render the same shell, and
  // a refused request is exactly what would empty it.
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Уровень' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Локация' })).toBeVisible();
});

test('resting on a boss row shows what it drops', async ({ page }) => {
  await page.goto('/raid-bosses');

  // A row in the middle: the drops are fetched per boss when the tooltip opens,
  // so this also covers that the anonymous request for them is allowed.
  await page.locator('tbody tr').nth(4).hover();

  const tooltip = page.locator('.ant-tooltip');
  await expect(tooltip).toBeVisible();

  const rows = tooltip.locator('tbody tr');
  await expect(rows.first()).toBeVisible();

  // Icon, name, grade, count and chance — the five the row is there to carry.
  await expect(rows.first().locator('img')).toBeVisible();
  await expect(rows.first()).toContainText('%');
  expect(await rows.count()).toBeGreaterThan(1);

  // Fully on screen: the tooltip sat off the right edge until it was moved off
  // `right` placement, and the grade and chance columns were the part cut off.
  const box = await tooltip.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
});

test('the catalogue does not let a visitor past the gate', async ({ page }) => {
  // The same visitor, one path over. `proxy.ts` opens `/raid-bosses` and
  // nothing else, and this is the assertion that says so.
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
});
