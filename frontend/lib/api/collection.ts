// global modules
import qs from 'qs';

// local modules
import { get } from './base';

const query = qs.stringify(
  {
    populate: ['items', 'items.item', 'items.item.image', 'effects'],
  },
  {
    encodeValuesOnly: true,
  }
);

export async function getCollectionList(token: string | undefined) {
  const params = token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
  const collections = await get(`/collections?${query}`, params);

  return collections;
}
