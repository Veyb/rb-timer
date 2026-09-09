// global modules
import axios from 'axios';
import { cookies } from 'next/headers';
import { cache } from 'react';

// local modules
import type { User } from '../types';
import { getUsersMe } from './api';

/**
 * The data access layer: where a server component gets the caller from.
 *
 * Next.js names this pattern and recommends it — see the authentication guide
 * shipped with the framework, "Creating a Data Access Layer (DAL)". Two things
 * make it worth having here rather than reading the cookie in each page.
 *
 * One is that `cache` memoises per render pass, so a layout and the page inside
 * it share a single answer. Before this, `/users/[userId]/management` asked the
 * backend who the caller was twice: once in the layout, once in the page's own
 * redirect check. Measured, not assumed.
 *
 * The other is that "the session is the `jwt` cookie" is now stated once. A
 * page that reads the cookie itself is a page that has to know the name, and
 * a page that has to know the name is one that can get it wrong.
 *
 * There is no `import 'server-only'` guard: `next/headers` is server-only
 * already and throws on a client import, so the package would add a dependency
 * to restate what the import below enforces.
 */

interface CurrentUser {
  user: User | null;
  jwt: string | undefined;
}

/**
 * The caller's credential, for handing to the API client. Undefined for a
 * visitor who is not signed in — every endpoint this app calls treats that as
 * the public role rather than as an error.
 */
export const getSessionToken = cache(async () => (await cookies()).get('jwt')?.value);

/**
 * The caller, as `/users/me` describes them, with the token that identified
 * them.
 *
 * A token the server rejects answers the same as no token: an expired session
 * is a signed-out visitor, not a broken page. Anything else is rethrown and
 * reaches `app/global-error.tsx` — this runs in the root layout, so it is
 * outside `app/error.tsx`.
 *
 * The distinction is the point. Swallowing everything here made a backend that
 * was down render as the signed-out shell, so a reader whose server had fallen
 * over was invited to log in again and told nothing about why it would not
 * work.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const jwt = await getSessionToken();

  if (!jwt) return { user: null, jwt: undefined };

  try {
    return { user: await getUsersMe(jwt), jwt };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (status === 401 || status === 403) return { user: null, jwt: undefined };

    throw error;
  }
});
