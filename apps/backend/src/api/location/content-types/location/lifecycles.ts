/**
 * Keeps `hasDungeon` true exactly when the location carries a dungeon plan.
 *
 * The flag exists because the plan itself can never be seen in the admin list.
 * A single component renders as a dash whatever it holds: `CellContent` falls
 * back to `content?.length > 0` when a column has no `mainField`, a component is
 * never given one — `createDefaultMetadata` assigns it only where
 * `attribute.type === 'relation'` — and a component instance is an object, so
 * `length` is `undefined`. Nor is a component sortable or filterable there, and
 * with 15 plans across 64 locations, narrowing the list is the useful part.
 *
 * Denormalised, so it is written here and nowhere else: the field is marked not
 * editable in the panel, and the seed sets it from the same source that decides
 * whether there is a plan at all.
 */

const hasPlan = (value: unknown) => {
  if (value === null || value === undefined) return false;

  // The admin panel sends the component as an object, a script as an object or
  // null, and a cleared field as null. An empty object is not a plan.
  if (typeof value === 'object') return Object.keys(value as object).length > 0;

  return Boolean(value);
};

const trackDungeon = (data: Record<string, unknown> | undefined) => {
  if (!data) return;

  // An update that does not mention `dungeon` leaves the stored plan alone, so
  // the flag has nothing to follow and must not be recomputed — reading it as
  // "no plan" is exactly the bug this guards against.
  if (!Object.hasOwn(data, 'dungeon')) return;

  data.hasDungeon = hasPlan(data.dungeon);
};

export default {
  async beforeCreate(event) {
    trackDungeon(event.params.data);
  },

  async beforeUpdate(event) {
    trackDungeon(event.params.data);
  },
};
