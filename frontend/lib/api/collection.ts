// global modules
import qs from 'qs';

// local modules
import { apiGet } from './base';
import { Meta } from '../../types';

function getQuery(page?: number) {
  return qs.stringify(
    {
      populate: ['items', 'items.item', 'items.item.image', 'effects'],
      pagination: {
        page: page || 1,
        pageSize: 100,
      },
    },
    {
      encodeValuesOnly: true,
    }
  );
}

export async function getCollectionList(
  token: string | undefined,
  page?: number
) {
  const query = getQuery(page);
  const params = token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
  const collections = await apiGet(`/collections?${query}`, params);

  return collections;
}

export async function getAllCollectionList(token: string | undefined) {
  let page = 1;
  let list = [];

  const { data: firstData, meta: firstMeta } = await getCollectionList(
    token,
    page
  );

  list = [...firstData];
  let meta: Meta = firstMeta;

  while (firstMeta.pageCount > meta.page) {
    const { data, meta: pageMeta } = await getCollectionList(token, ++page);
    list = [...list, ...data];
    meta = pageMeta;
  }

  return { data: list, meta };
}
