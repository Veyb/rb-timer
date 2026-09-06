// global modules
import axios, { type AxiosRequestConfig } from 'axios';

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

export async function apiGet(type: string, params?: AxiosRequestConfig) {
  const { data } = await axios.get(`${API_URL}${type}`, params);

  return data.data ? { data: flattenListApiResponse(data), meta: data.meta.pagination } : data;
}

export async function apiPost<T extends object>(type: string, params: T) {
  const res = await axios.post(`${API_URL}${type}`, params);

  return res.data;
}

export async function apiDelete(type: string, params?: AxiosRequestConfig) {
  const res = await axios.delete(`${API_URL}${type}`, params);

  return res.data;
}
