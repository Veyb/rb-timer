// Turns one boss's own page into the fields the article cannot state.
//
// Everything here is read from the page under *our* server's prefix. The
// article carries statistics and a level badge too, but they belong to the
// other server — Queen Ant reads 75 and 24,462,500 HP there and 56 and
// 10,176,400 on this page — so nothing in this file is ever fed from it.
//
// The location is read but is not a refreshed field. The source names locations
// by transliteration of another language — `muravejnik` where the catalogue
// holds `the-ant-nest` — so there is no correspondence to follow, and the
// catalogue's own names were settled by hand. A boss already in the catalogue
// keeps the location it has. A boss that is new is the one exception: there is
// nothing to preserve, so its location is taken and reported loudly, because
// the name arrives transliterated and wants replacing by hand.
//
// `Respawn Time` is missing from some pages rather than different: the source
// omits it entirely for a handful of bosses under this server while publishing
// it for the other. That is a defect on their side, so the caller re-reads that
// one field from the other server's page instead of leaving ours to rot.

const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const number = (value) => Number(value.replace(/\s/g, ''));

/** `<div class="stat_name">HP / MP</div><span>10 176 400 / 10 550</span>` */
const statLines = (html) => {
  const lines = new Map();

  for (const [, name, body] of html.matchAll(
    /<div class="stat_name">([\s\S]*?)<\/div>([\s\S]*?)<\/div>/g,
  )) {
    lines.set(text(name), text(body));
  }

  return lines;
};

/** The pairs the page states as `A / B`, mapped onto the catalogue's names. */
const PAIRS = {
  'HP / MP': ['hp', 'mp'],
  'P. Atk. / M. Atk.': ['pAtk', 'mAtk'],
  'P. Def. / M. Def.': ['pDef', 'mDef'],
  'Accuracy / Evasion': ['acc', 'eva'],
  'Exp / SP': ['exp', 'sp'],
};

/**
 * `Fixed`, or `10 hours ± 2 hours`, or `6 hours`.
 *
 * Anything else is returned unparsed rather than guessed at, so the caller can
 * report it instead of writing a silent null into the catalogue.
 */
const parseRespawn = (raw) => {
  if (!raw) return null;
  if (/^fixed$/i.test(raw)) {
    return { raw, fixed: true, base: null, variance: null, baseHours: null, varianceHours: null };
  }

  const match = raw.match(/^([\d.]+)\s*hours?(?:\s*±\s*([\d.]+)\s*hours?)?$/i);
  if (!match)
    return {
      raw,
      fixed: false,
      base: null,
      variance: null,
      baseHours: null,
      varianceHours: null,
      unparsed: true,
    };

  return {
    raw,
    fixed: false,
    base: `${match[1]} hours`,
    variance: match[2] ? `${match[2]} hours` : null,
    baseHours: Number(match[1]),
    varianceHours: match[2] ? Number(match[2]) : null,
  };
};

const parseBoss = (html) => {
  const lines = statLines(html);
  const type = html.match(/item-name__type">\s*([^<]+)</)?.[1]?.trim() ?? '';

  const stats = {};
  for (const [label, [first, second]] of Object.entries(PAIRS)) {
    const value = lines.get(label);
    if (!value) continue;
    const [a, b] = value.split('/').map((part) => part.trim());
    stats[first] = number(a);
    stats[second] = number(b);
  }

  // The dropdown lists the step the crystal moves through; the one it can reach
  // is the highest of them. Its markup is already in the page — the dropdown
  // only hides it visually.
  const steps = [...html.matchAll(/soul_crystal_step">(\d+)</g)].map((match) => Number(match[1]));

  return {
    race: type.split(',')[0]?.trim() || null,
    level: Number(type.match(/Lv\.\s*(\d+)/)?.[1]) || null,
    stats: Object.keys(stats).length === 10 ? stats : null,
    respawn: parseRespawn(lines.get('Respawn Time')),
    location: {
      slug: html.match(/\/location\/\d+-([a-z0-9-]+)"/)?.[1] ?? null,
      name:
        text(html.match(/class="location_button nav_link"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '') ||
        null,
    },
    saMaxLevel: steps.length ? Math.max(...steps) : null,
    saChance: html.match(/soul_crystal_chance">([^<]+)</)?.[1]?.trim() ?? null,
    // Deliberately not the skills: every link here is a skill, and most of them
    // are lore, shared mechanics or neutral descriptors the catalogue does not
    // hold. What counts as one lives in `parse-skills.js`, and listing them
    // here as well produced a boss referring to 169 skills that do not exist.
    attackAttribute: lines.get('Attack Attribute') ?? null,
    defenseAttributes: lines.get('Defense Attributes') ?? lines.get('Defense Attribute') ?? null,
  };
};

module.exports = { parseBoss, parseRespawn, statLines, text };
