// global modules
import axios, { type AxiosRequestConfig } from 'axios';

import type { Meta } from '../../types';

/**
 * Read straight from `process.env` with the `NEXT_PUBLIC_` prefix, which is
 * what makes Next.js inline them into the browser bundle. They used to be
 * listed under the `env` key in `next.config.js` — a key the framework's own
 * documentation marks `version: legacy`, and which inlines its values whether
 * or not they are prefixed.
 *
 * Being in the browser bundle is the point: the browser calls the API and
 * opens the socket itself. The consequence to know is that the server render
 * uses the same public address, so there is no separate internal URL for SSR.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const isArray = (value: unknown): value is unknown[] =>
  Object.prototype.toString.call(value) === '[object Array]';

export const flattenApiResponse = (input: unknown): unknown => {
  const flatten = (value: Record<string, unknown>): unknown => {
    if (!value.attributes) return value;

    return {
      id: value.id,
      ...(value.attributes as Record<string, unknown>),
    };
  };

  if (isArray(input)) {
    return input.map((item) => flattenApiResponse(item));
  }

  if (isRecord(input)) {
    let data: unknown = input;

    if (isArray(input.data)) {
      data = [...input.data];
    } else if (isRecord(input.data)) {
      data = flatten({ ...input.data });
    } else if (input.data === null) {
      data = null;
    } else {
      data = flatten(input);
    }

    if (isArray(data)) {
      return data.map((item) => flattenApiResponse(item));
    }

    if (isRecord(data)) {
      const result: Record<string, unknown> = {};
      for (const key in data) {
        result[key] = flattenApiResponse(data[key]);
      }
      return result;
    }

    return data;
  }

  return input;
};

export const flattenListApiResponse = ({ data }: { data: unknown[] }) => {
  return data.map(flattenApiResponse);
};

/**
 * The Authorization header, or nothing at all when there is no token.
 *
 * One helper rather than the same three lines in every client. The `undefined`
 * case matters: building the header anyway sends the literal string
 * `Bearer undefined`, which the server rejects as a bad credential (401)
 * instead of answering as the public role would.
 */
export const authHeaders = (token: string | undefined): AxiosRequestConfig =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

/** The same, for a request that carries a JSON body. */
export const jsonHeaders = (token: string | undefined): AxiosRequestConfig => ({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

/**
 * A response as this application's own endpoints send it: the value itself,
 * with no envelope.
 *
 * Separate from `apiGetList` on purpose. This used to be one function that
 * decided by looking for a `data` key in the body, which worked only for as
 * long as no hand-written endpoint happened to return one — and would have
 * thrown on the first that did, since it then also reads `meta.pagination`.
 * Which shape an endpoint speaks is a fact about the endpoint, so the caller
 * says it.
 */
export async function apiGet<T>(type: string, params?: AxiosRequestConfig): Promise<T> {
  const { data } = await axios.get(`${API_URL}${type}`, params);

  return data as T;
}

/**
 * A response as Strapi's own content API sends it: `{ data, meta }`, with each
 * entry wrapped in `attributes`. Used for the collection types served by a core
 * router — bosses, collections, donations.
 */
export async function apiGetList<T>(
  type: string,
  params?: AxiosRequestConfig,
): Promise<{ data: T[]; meta: Meta }> {
  const { data } = await axios.get(`${API_URL}${type}`, params);

  return { data: flattenListApiResponse(data) as T[], meta: data.meta.pagination };
}

/**
 * Runs a page's data fetch, treating a refusal as "nothing to show" and
 * anything else as a fault.
 *
 * Pages used to wrap every fetch in a bare `try {} catch {}`, which made a
 * backend that was down look exactly like a community with no bosses in it.
 * They cannot simply let everything through either: the access gate is
 * rendered client-side from `/users/me`, so a member the gate will refuse
 * still asks for the data first and is answered 401 or 403. That answer is
 * expected and the placeholder explains it.
 *
 * Everything else — a connection refused, a 500, a malformed body — reaches
 * `app/error.tsx` and says so.
 */
export async function loadOrEmpty<T>(
  load: () => Promise<T>,
  whenRefused: T,
  /**
   * Which answers count as "nothing to show". A lookup by id adds 404: a
   * document of another community answers as missing on purpose, and the page
   * turns that into `notFound()` rather than into a fault.
   */
  expected: number[] = [401, 403],
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (status !== undefined && expected.includes(status)) return whenRefused;

    throw error;
  }
}

export async function apiPost<T extends object>(type: string, params: T) {
  const res = await axios.post(`${API_URL}${type}`, params);

  return res.data;
}

export async function apiDelete(type: string, params?: AxiosRequestConfig) {
  const res = await axios.delete(`${API_URL}${type}`, params);

  return res.data;
}
