import { Collection, Effect, UserCollections } from '../../types';

export function getEffects(
  collections: Collection[],
  userCollections: UserCollections
) {
  const checkedCollectionIds = Object.entries(userCollections).reduce(
    (acc: number[], [collectionId, checkedIds]) => {
      const checkedArray = Object.values(checkedIds);
      const isCheckedCollection = checkedArray.every(Boolean);

      return isCheckedCollection ? [...acc, +collectionId] : acc;
    },
    []
  );

  const onlyCheckedCollections = collections.filter(({ id }) =>
    checkedCollectionIds.includes(id)
  );

  const effectsHash = onlyCheckedCollections.reduce(
    (acc: Record<string, Effect>, collection) => {
      collection.effects.forEach((effect) => {
        acc[effect.id]
          ? (acc[effect.id] = {
              ...acc[effect.id],
              value: acc[effect.id].value + effect.value,
            })
          : (acc[effect.id] = effect);
      });

      return acc;
    },
    {}
  );

  return Object.values(effectsHash);
}

export function getDefaultUserCollections(
  collections: Collection[]
): UserCollections {
  return collections.reduce((acc, collection) => {
    return {
      ...acc,
      [collection.id]: collection.items.reduce((acc, item) => {
        return { ...acc, [item.id]: false };
      }, {}),
    };
  }, {});
}
