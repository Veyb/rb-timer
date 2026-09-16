import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

/**
 * Reachable without a session, subpaths included. The raid-boss catalogue is
 * game reference data rather than any community's records — see
 * `raid-boss-catalog` and the gate's own `community-membership-gate` — so a
 * visitor with no account reads it, and the backend grants the same actions to
 * the `public` role.
 *
 * A prefix rather than an exact path because a boss will be addressed by slug
 * under here; an exact match would send `/raid-bosses/queen-ant` to the login
 * screen while `/raid-bosses` rendered.
 */
const PUBLIC_PREFIXES = ['/raid-bosses'];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) ||
  PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const jwt = request.cookies.get('jwt')?.value;

  if (!jwt && !isPublic(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf|xml|txt|json)$).*)',
  ],
};
