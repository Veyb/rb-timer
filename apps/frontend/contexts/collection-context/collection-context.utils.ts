// local modules
import type { Collection, Effect, UserCollections } from '../../types';

export function getCheckedCollectionIds(userCollections: UserCollections) {
  return Object.entries(userCollections).reduce((acc: number[], [collectionId, checkedIds]) => {
    const checkedArray = Object.values(checkedIds);
    const isCheckedCollection = checkedArray.every(Boolean);

    if (isCheckedCollection) acc.push(+collectionId);
    return acc;
  }, []);
}

export function getEffects(collections: Collection[], userCollections: UserCollections) {
  const checkedCollectionIds = getCheckedCollectionIds(userCollections);

  const onlyCheckedCollections = collections.filter(({ id }) => checkedCollectionIds.includes(id));

  const effectsHash = onlyCheckedCollections.reduce((acc: Record<string, Effect>, collection) => {
    collection.effects.forEach((effect) => {
      const existing = acc[effect.name];

      acc[effect.name] = existing ? { ...existing, value: existing.value + effect.value } : effect;
    });

    return acc;
  }, {});

  return Object.values(effectsHash);
}

export function getDefaultUserCollections(collections: Collection[]): UserCollections {
  return collections.reduce((acc: UserCollections, collection) => {
    acc[collection.id] = collection.items.reduce((itemAcc: Record<number, boolean>, item) => {
      itemAcc[item.id] = false;
      return itemAcc;
    }, {});
    return acc;
  }, {});
}
