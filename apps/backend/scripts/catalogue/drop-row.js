// One parsed drop row, in the shape the data files hold.
//
// Here rather than in the pass that writes the drops, because two passes write
// them now: the drop refresh for this server, and the Gamma refresh for the
// bosses the two servers disagree about. The rate is a rule rather than a
// value, and a rule kept in two places is a rule that disagrees with itself.

const iconPath = (itemId) => `images/item-icons/${itemId}.webp`;

/**
 * The chance a row actually drops at, rather than the weight the source shows.
 *
 * The source states drops in groups: a group carries a gate, and the rows
 * inside it carry weights that sum to 100. So the weight on the page is not the
 * drop rate — `Ring Mail Breastplate` reads 41.4548% inside a gate of 85.3642%
 * and really falls 35.3876% of the time.
 *
 * Folding the gate in is what lets the group itself go unstored. It is also the
 * convention this catalogue started from: the original scrape published the
 * folded value, and folding reproduces it — `Puma Skin Gaiters` is 38.7833
 * inside a 97.4288% gate, which is the 37.7861 that scrape recorded.
 *
 * Four decimals because that is the precision the folded values were published
 * at, and because nothing rounds to zero at it: the smallest is 0.0013%.
 */
const effectiveChance = (row) => Number(((row.chance * (row.groupChance ?? 100)) / 100).toFixed(4));

/**
 * `grade` is the source's own, lowercased to the catalogue's codes. It is the
 * item's grade and not the row's: the badge sits inside the item's own link,
 * beside its name, and across every row no item is ever stated at two
 * different grades — which `catalog-source.test.ts` checks against the file
 * rather than taking on trust. The catalogue used to infer this from the levels
 * of the bosses that drop a thing, and disagreed with the source on 500 of the
 * 850 items it then held.
 */
const toDrop = (row) => ({
  itemId: row.itemId,
  name: row.name,
  grade: (row.grade || 'ng').toLowerCase(),
  chance: effectiveChance(row),
  minCount: row.minCount,
  maxCount: row.maxCount,
  icon: row.itemId ? iconPath(row.itemId) : null,
});

/** Whether two stored rows say the same thing about the same item. */
const sameDrop = (a, b) =>
  a.chance === b.chance && a.minCount === b.minCount && a.maxCount === b.maxCount;

module.exports = { iconPath, effectiveChance, toDrop, sameDrop };
