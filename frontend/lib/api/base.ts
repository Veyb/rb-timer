// global modules
import axios from 'axios';
import getConfig from 'next/config';

const { env } = getConfig();
export const API_URL = process.env.API_URL || env.API_URL;
export const IMAGE_URL = process.env.IMAGE_URL || env.IMAGE_URL;

export const flattenApiResponse = (data: any) => {
  const isObject = (data: any) =>
    Object.prototype.toString.call(data) === '[object Object]';
  const isArray = (data: any) =>
    Object.prototype.toString.call(data) === '[object Array]';

  const flatten = (data: any) => {
    if (!data.attributes) return data;

    return {
      id: data.id,
      ...data.attributes,
    };
  };

  if (isArray(data)) {
    return data.map((item: any) => flattenApiResponse(item));
  }

  if (isObject(data)) {
    if (isArray(data.data)) {
      data = [...data.data];
    } else if (isObject(data.data)) {
      data = flatten({ ...data.data });
    } else if (data.data === null) {
      data = null;
    } else {
      data = flatten(data);
    }

    for (const key in data) {
      data[key] = flattenApiResponse(data[key]);
    }

    return data;
  }

  return data;
};

export const flattenListApiResponse = ({ data }: any) => {
  return data.map(flattenApiResponse);
};

export async function get(type: string, params?: any) {
  const { data } = await axios.get(`${API_URL}${type}`, params);

  return data.data
    ? { data: flattenListApiResponse(data), meta: data.meta.pagination }
    : data;
}

export async function post(type: string, params: any) {
  const res = await axios.post(`${API_URL}${type}`, params);

  return res.data;
}
