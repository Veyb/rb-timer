// local modules
import { Collection, Effect, UserCollections } from '../../types';

export function getCheckedCollectionIds(userCollections: UserCollections) {
  return Object.entries(userCollections).reduce(
    (acc: number[], [collectionId, checkedIds]) => {
      const checkedArray = Object.values(checkedIds);
      const isCheckedCollection = checkedArray.every(Boolean);

      return isCheckedCollection ? [...acc, +collectionId] : acc;
    },
    []
  );
}

export function getEffects(
  collections: Collection[],
  userCollections: UserCollections
) {
  const checkedCollectionIds = getCheckedCollectionIds(userCollections);

  const onlyCheckedCollections = collections.filter(({ id }) =>
    checkedCollectionIds.includes(id)
  );

  const effectsHash = onlyCheckedCollections.reduce(
    (acc: Record<string, Effect>, collection) => {
      collection.effects.forEach((effect) => {
        acc[effect.name]
          ? (acc[effect.name] = {
              ...acc[effect.name],
              value: acc[effect.name].value + effect.value,
            })
          : (acc[effect.name] = effect);
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
