import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test as teardown } from '@playwright/test';

import { FIXTURE_USER, JOINER_USER } from './fixtures/constants';

const BACKEND_DIR = path.resolve(__dirname, '../../backend');

const backend = (...args: string[]) =>
  execFileSync('pnpm', ['run', ...args], { cwd: BACKEND_DIR, stdio: 'inherit' });

/**
 * Puts the development database back the way the run found it.
 *
 * The setup provisions every fixture into a known state before a run, which is
 * what makes the run deterministic. This is the other half: what the run leaves
 * behind. Without it the joiner account stays a member of a community it is
 * named for not being in, and every run adds invite codes to a screen a person
 * also uses by hand.
 *
 * Runs after the whole suite, and after a failed one too — see
 * `playwright.config.ts`, where it is the setup project's `teardown`.
 */
teardown('return the joiner account to having no community', () => {
  backend('e2e:fixture', JOINER_USER.email, '--role=authenticated', '--community=none');
});

teardown('remove the invite codes the run issued', () => {
  // Through a script with database access rather than the API, because the API
  // has no way to delete a code and should not: an officer who could remove one
  // could invite whoever they liked and leave nothing behind. Scoped to codes
  // issued by the fixture officer, so seed data and a developer's own codes are
  // untouched — with the one caveat that a code made by hand while signed in as
  // that fixture account is indistinguishable from a test's, and goes too.
  backend('e2e:invite-cleanup', FIXTURE_USER.email);
});
