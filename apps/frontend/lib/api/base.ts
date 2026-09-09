// global modules
import axios, { type AxiosRequestConfig } from 'axios';

import type { Meta } from '../../types';

export const API_URL = process.env.API_URL;
export const IMAGE_URL = process.env.IMAGE_URL;
export const SOCKET_URL = process.env.SOCKET_URL;

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

export async function apiPost<T extends object>(type: string, params: T) {
  const res = await axios.post(`${API_URL}${type}`, params);

  return res.data;
}

export async function apiDelete(type: string, params?: AxiosRequestConfig) {
  const res = await axios.delete(`${API_URL}${type}`, params);

  return res.data;
}
