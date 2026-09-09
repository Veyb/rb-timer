import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The JWT out of a saved session, for the few things a spec needs to arrange
 * through the API rather than through the UI.
 *
 * Reading the cookie the setup already stored is deliberate: signing in again
 * per spec is what trips Strapi's rate limit on `/auth/local`, which is why
 * those sessions exist in the first place.
 */
export const tokenFromSession = (storageStatePath: string) => {
  const file = path.resolve(__dirname, '../..', storageStatePath);
  const state = JSON.parse(readFileSync(file, 'utf8')) as {
    cookies: { name: string; value: string }[];
  };
  const jwt = state.cookies.find((cookie) => cookie.name === 'jwt')?.value;

  if (!jwt) throw new Error(`No jwt cookie in ${storageStatePath}`);

  return jwt;
};

export const API_BASE = process.env.API_URL ?? 'http://localhost:1337/api';
