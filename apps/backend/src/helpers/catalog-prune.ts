/**
 * Removes what the source has stopped listing.
 *
 * Separate from the seed on purpose, and the reason is the asymmetry between
 * the two mistakes. A seed that misses a record leaves the catalogue short by
 * one until the next run; a seed that deletes on a source it failed to read
 * empties the catalogue, and the backup is the only way back. So the seed only
 * ever adds and updates, and taking something away is an act an operator asks
 * for by name.
 *
 * Reports by default and deletes only when told to. The report is not a
 * courtesy: renaming an item creates a new record and strands the old one, so
 * the list this prints is the list of things a refresh left behind — and
 * reading it is how an operator tells a rename from a removal.
 *
 * Removes in dependency order: the drops first, then the bosses the source has
 * stopped listing, then the items nothing drops any more. The other way round
 * would orphan the drops instead.
 */

import type { Core } from '@strapi/strapi';

import { type CatalogSource, readCatalogGrades, readCatalogSource } from './catalog-source';

const DROP_UID = 'api::boss-drop.boss-drop';
const ITEM_UID = 'api::item.item';

export interface PruneReport {
  /** `<boss slug> — <item name>` for each drop the source no longer states. */
  drops: string[];
  /** Slugs of bosses the source no longer lists at all. */
  bosses: string[];
  /** Names of items no surviving drop points at. */
  items: string[];
  /**
   * Records that are stranded but carry a grade someone set by hand. Named and
   * left alone: the grade is work the catalogue cannot derive again, and a row
   * nothing points at costs a row.
   */
  keptByHand: string[];
  /** Whether anything was actually removed, or only listed. */
  deleted: boolean;
}

interface StoredDrop {
  documentId: string;
  raidBoss?: { slug: string } | null;
  item?: { name: string } | null;
}

interface StoredItem {
  documentId: string;
  slug: string;
  name: string;
}

const BOSS_UID = 'api::raid-boss.raid-boss';

/**
 * A boss and an item, as both the source and the database can name the pair.
 *
 * The separator is safe rather than merely unlikely: a boss slug is `[a-z0-9-]`
 * and cannot contain one, so the join is unambiguous however odd the item name.
 */
const pairOf = (bossSlug: string | undefined, itemName: string | undefined) =>
  `${bossSlug ?? ''}|${itemName ?? ''}`;

export const pruneCatalog = async (
  strapi: Core.Strapi,
  {
    source = readCatalogSource(),
    deleting = false,
    gradesFile,
  }: { source?: CatalogSource; deleting?: boolean; gradesFile?: string } = {},
): Promise<PruneReport> => {
  // Before anything is read from the database. A source that failed to load
  // and a source that genuinely lists nothing look the same from here, and the
  // difference between them is the entire catalogue.
  if (!source.bosses.length) {
    throw new Error(
      'the source lists no bosses, so nothing can be said about what it dropped. ' +
        'Refusing to remove anything.',
    );
  }

  const stated = new Set(source.drops.map((drop) => pairOf(drop.bossSlug, drop.itemName)));

  const storedDrops: StoredDrop[] = await strapi.db.query(DROP_UID).findMany({
    populate: { raidBoss: { select: ['slug'] }, item: { select: ['name'] } },
  });

  const stale = storedDrops.filter(
    (drop) => !stated.has(pairOf(drop.raidBoss?.slug, drop.item?.name)),
  );

  // An item survives if any drop that is *not* going away names it. Computed
  // from the rows in hand rather than by re-reading after the delete, so the
  // report says the same thing whether or not anything is removed.
  const staleIds = new Set(stale.map((drop) => drop.documentId));
  const stillDropped = new Set(
    storedDrops
      .filter((drop) => !staleIds.has(drop.documentId))
      .map((drop) => drop.item?.name)
      .filter(Boolean),
  );

  const storedItems: StoredItem[] = await strapi.db
    .query(ITEM_UID)
    .findMany({ select: ['documentId', 'slug', 'name'] });

  // Bosses the source has stopped listing. Without this they survive every
  // prune with each of their drops taken away one by one, which leaves a record
  // indistinguishable from a boss that genuinely drops nothing.
  const listed = new Set(source.bosses.map((boss) => boss.slug));
  const storedBosses: StoredItem[] = await strapi.db
    .query(BOSS_UID)
    .findMany({ select: ['documentId', 'slug', 'name'] });
  const strandedBosses = storedBosses.filter((boss) => !listed.has(boss.slug));

  const grades = readCatalogGrades(gradesFile);
  const graded = grades.items;
  const orphaned = storedItems.filter((item) => !stillDropped.has(item.name));
  const removable = orphaned.filter((item) => !graded[item.slug]);
  const removableBosses = strandedBosses.filter((boss) => !grades.bosses[boss.slug]);
  const keptByHand = [
    ...orphaned.filter((item) => graded[item.slug]).map((item) => item.name),
    ...strandedBosses.filter((boss) => grades.bosses[boss.slug]).map((boss) => boss.name),
  ];

  const report: PruneReport = {
    drops: stale.map((drop) => `${drop.raidBoss?.slug ?? '?'} — ${drop.item?.name ?? '?'}`).sort(),
    bosses: removableBosses.map((boss) => boss.slug).sort(),
    items: removable.map((item) => item.name).sort(),
    keptByHand: keptByHand.sort(),
    deleted: deleting,
  };

  if (!deleting) return report;

  // Dependency order. The drops first, so nothing is left pointing at a record
  // that has gone; then the bosses, whose drops are all among those; then the
  // items, which is the only step that needed the drops counted first.
  for (const drop of stale) {
    await strapi.documents(DROP_UID).delete({ documentId: drop.documentId });
  }
  for (const boss of removableBosses) {
    await strapi.documents(BOSS_UID).delete({ documentId: boss.documentId });
  }
  for (const item of removable) {
    await strapi.documents(ITEM_UID).delete({ documentId: item.documentId });
  }

  // Imagery is deliberately untouched. A file nothing references looks exactly
  // like one an operator uploaded, and the cost of keeping it is a file.

  return report;
};
