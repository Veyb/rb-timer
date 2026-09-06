import { test as base, expect } from '@playwright/test';

// Auto-attached to every test using this `test`: fails the test if the page
// logged a console error or threw an uncaught exception. Deliberately only
// checks type 'error' — dev-mode console.warn/info/log noise (HMR messages,
// React DevTools suggestions, unused-preload warnings) shouldn't fail a
// smoke test meant to catch "the screen crashed," not "the console is noisy."
// biome-ignore lint/suspicious/noConfusingVoidType: `void` is Playwright's own documented convention for a value-less auto fixture - their official fixtures guide (playwright.dev/docs/test-fixtures) uses this exact pattern verbatim: `base.extend<{ forEachTest: void }>(...)`. `undefined` would be a non-idiomatic deviation for no benefit.
export const test = base.extend<{ assertNoConsoleErrors: void }>({
  assertNoConsoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await use();

      expect(errors, `Uncaught console errors:\n${errors.join('\n')}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
