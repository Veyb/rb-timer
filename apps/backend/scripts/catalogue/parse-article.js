// Turns the reference's raid-boss article into boss records.
//
// The article is the cheapest thing the source publishes: one request describes
// every boss's roster entry and both of its drop tables. It is also the one
// place where the source is misleading, in two ways worth stating here because
// both are invisible from the markup.
//
// It embeds statistic tables and level badges belonging to a *different* game
// server than the address it is filed under — Queen Ant reads level 75 with
// 24,462,500 HP here and 56 with 10,176,400 on its own page for our server. So
// nothing in this file reads a statistic or a level. Those come from the
// per-boss pages, and only from there.
//
// And each boss carries two drop tables, the other server's first. They are
// selected by the text of their `<summary>`, never by position.
//
// What the article *is* authoritative for: which bosses exist, which are epic,
// which grant a subclass, and what each one drops on each server.

/** How the article's stat labels map onto the catalogue's field names. */
const STAT_FIELDS = {
  HP: 'hp',
  MP: 'mp',
  'P. Atk.': 'pAtk',
  'M. Atk.': 'mAtk',
  'P. Def.': 'pDef',
  'M. Def.': 'mDef',
  Exp: 'exp',
  SP: 'sp',
};

/** The label of the drop table for our server. */
const OUR_DROPS = 'Drop Black/ White/ Carmine';

/** The other server's, parsed so that it can be kept alongside rather than discarded. */
const OTHER_DROPS = 'Drop Gamma';

const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Bosses are found by the kind of link they open with, not by their badge.
 *
 * The badge is not usable as a filter: an ordinary boss says `Raid Boss`, the
 * four spirits say `Subclass Raid Boss`, and each epic carries a flavour title
 * of its own — `Queen of Underground`. What separates a boss from a drop is the
 * link: bosses are `/npc/<id>-<slug>`, items are `/item/<id>-<slug>`.
 */
const BOSS_LINK = /<a href="\/[a-z0-9-]+\/npc\/(\d+)-([a-z0-9-]+)"[^>]*class="item-name\s*">/g;

const parseDropRows = (body) => {
  const rows = [];
  let group = null;
  let groupChance = null;

  for (const [, row] of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const grouped = row.match(/Group Chance:\s*([\d.]+)%/);
    if (grouped) {
      // Groups are numbered as they appear; the source names them only by the
      // chance that gates them.
      group = (group ?? 0) + 1;
      groupChance = Number.parseFloat(grouped[1]);
      continue;
    }

    const link = row.match(/href="\/[a-z0-9-]+\/item\/(\d+)-([a-z0-9-]+)"/);
    if (!link) continue;

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => text(cell[1]));
    const amount = cells.find((cell) => /^\d[\d\s]*(-\s*[\d\s]+)?$/.test(cell)) ?? '';
    const chance = cells.find((cell) => /%$/.test(cell)) ?? '';
    const count = (value) => Number(value.replace(/\s/g, ''));
    const [min, max] = amount.includes('-')
      ? amount.split('-').map(count)
      : [count(amount), count(amount)];

    rows.push({
      gameId: link[1],
      slug: link[2],
      // The source's icon filename, which is what this catalogue calls `itemId`.
      itemId: row.match(/\/i64\/([^"?]+)\.png/)?.[1] ?? null,
      // `class-N` is the item's colour band, not a fixed wrapper: 7501 rows on
      // the page say `class-1` and four say `class-3` or `class-4`. Matching
      // the literal `class-1` silently loses the name on Queen Ant's two rings.
      name: text(row.match(/item-name__class-\d+">([^<]*)</)?.[1] ?? ''),
      grade: text(row.match(/item-grade">([^<]*)</)?.[1] ?? '') || null,
      minCount: min,
      maxCount: max,
      chance: Number.parseFloat(chance),
      group,
      groupChance,
    });
  }

  return rows;
};

const parseArticle = (html) => {
  const headings = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((match) => ({
    at: match.index,
    title: text(match[1]),
  }));

  const sectionAt = (index) => {
    let title = '';
    for (const heading of headings) if (heading.at < index) title = heading.title;

    return title;
  };

  const opens = [...html.matchAll(BOSS_LINK)];

  return opens.map((open, n) => {
    const start = open.index;
    const end = n + 1 < opens.length ? opens[n + 1].index : html.length;
    const block = html.slice(start, end);
    const section = sectionAt(start);

    const badges = [...block.matchAll(/item-name__additional">([^<]*)</g)].map((badge) =>
      badge[1].trim(),
    );

    const drops = {};
    for (const [, summary, body] of block.matchAll(
      /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g,
    )) {
      drops[text(summary)] = parseDropRows(body);
    }

    // The level badge and the stat table belong to the *other* server, which is
    // why they are named for it. Reading them as this server's numbers is the
    // single easiest mistake to make with this page.
    const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => text(cell[1]));
    const otherStats = {};
    for (let i = 0; i + 1 < cells.length; i++) {
      const field = STAT_FIELDS[cells[i]];
      if (field) otherStats[field] = Number(cells[i + 1].replace(/\s/g, ''));
    }

    const levelBadge = badges.find((badge) => /^Lv\.\s*\d+$/.test(badge));

    return {
      id: open[1],
      slug: `${open[1]}-${open[2]}`,
      name: text(block.match(/item-name__content">([\s\S]*?)<span/)?.[1] ?? ''),
      section,
      badges,
      otherLevel: levelBadge ? Number(levelBadge.replace(/\D/g, '')) : null,
      otherStats: Object.keys(otherStats).length === 8 ? otherStats : null,
      epic: section === 'Epic Bosses',
      subclass: badges.some((badge) => /subclass/i.test(badge)),
      drops: {
        ours: drops[OUR_DROPS] ?? null,
        other: drops[OTHER_DROPS] ?? null,
      },
    };
  });
};

module.exports = { OUR_DROPS, OTHER_DROPS, parseArticle, parseDropRows, text };
