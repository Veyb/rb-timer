// global modules
import qs from 'qs';
import type { Donation, Meta } from '../../types';
// local modules
import { apiGetList, authHeaders } from './base';

function getQuery(page?: number) {
  return qs.stringify(
    {
      pagination: {
        page: page || 1,
        pageSize: 100,
      },
    },
    {
      encodeValuesOnly: true,
    },
  );
}

export async function getDonationList(token: string | undefined, page?: number) {
  const query = getQuery(page);
  const donations = await apiGetList<Donation>(`/donations?${query}`, authHeaders(token));

  return donations;
}

export async function getAllDonationList(token: string | undefined) {
  let page = 1;
  let list = [];

  const { data: firstData, meta: firstMeta } = await getDonationList(token, page);

  list = [...firstData];
  let meta: Meta = firstMeta;

  while (firstMeta.pageCount > meta.page) {
    const { data, meta: pageMeta } = await getDonationList(token, ++page);
    list = [...list, ...data];
    meta = pageMeta;
  }

  return { data: list, meta };
}
