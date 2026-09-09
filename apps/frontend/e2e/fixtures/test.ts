import { test as base, expect } from '@playwright/test';

// Auto-attached to every test using this `test`: fails the test if the page
// logged a console error or threw an uncaught exception. Deliberately only
// checks type 'error' — dev-mode console.warn/info/log noise (HMR messages,
// React DevTools suggestions, unused-preload warnings) shouldn't fail a
// smoke test meant to catch "the screen crashed," not "the console is noisy."
//
// Chromium also reports a failed request as a console error ("Failed to load
// resource: the server responded with a status of 403"), which is right for
// a smoke test and wrong for a test whose subject *is* a refusal. Such a test
// declares what it expects with
//
//   test.use({ allowedConsoleErrors: [/403/] });
//
// — a list, not a switch, so the guard still holds for everything else the
// screen might log while the expected failure happens.
export const test = base.extend<{
  allowedConsoleErrors: RegExp[];
  // biome-ignore lint/suspicious/noConfusingVoidType: `void` is Playwright's own documented convention for a value-less auto fixture - their official fixtures guide (playwright.dev/docs/test-fixtures) uses this exact pattern verbatim: `base.extend<{ forEachTest: void }>(...)`. `undefined` would be a non-idiomatic deviation for no benefit.
  assertNoConsoleErrors: void;
}>({
  allowedConsoleErrors: [[], { option: true }],
  assertNoConsoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      const expected = (text: string) => allowedConsoleErrors.some((pattern) => pattern.test(text));

      page.on('console', (msg) => {
        if (msg.type() === 'error' && !expected(msg.text())) errors.push(msg.text());
      });
      page.on('pageerror', (error) => {
        if (!expected(error.message)) errors.push(error.message);
      });

      await use();

      expect(errors, `Uncaught console errors:\n${errors.join('\n')}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
