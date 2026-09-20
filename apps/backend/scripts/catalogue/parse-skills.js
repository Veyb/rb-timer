// Reads the skills a boss carries out of the boss's own page.
//
// No page of its own is fetched for any skill. Beside each skill on a boss's
// page sits a dropdown holding the description of the level *that boss* has —
// the racial trait's numbers for `4416-1`, the bare sentence for `4273-3` — so
// every modifier the catalogue needs is already in the pages the profile pass
// cached. A skill's own page states the vocabulary of its levels, which the
// reading client may want and the seed does not.
//
// What is kept is decided by what a skill says, never by its group number. A
// dropdown that yields neither a numbered line nor a named affinity is not a
// skill this catalogue holds. That drops the lore and the shared raid mechanics
// without naming them, and it drops the stat-scale family `4408`-`4413`, whose
// carriers all sit at the neutral level — "Average P. Def. Lv. 11",
// "HP Increase (1x)" — and state nothing at all.
//
// An allowlist of group numbers was written and thrown away. Those same
// descriptors carry real numbers at other levels: "Extremely Weak P. Def.
// Lv. 1" is −61%. A boss moved there by a patch is exactly the boss a player is
// looking for, and a blessed list of numbers would lose it in silence.

const { text } = require('./parse-boss');

/** The weapon the boss swings. Equipment, not a defence; the one exclusion by number. */
const EXCLUDED_GROUPS = new Set(['4415']);

/**
 * Where a skill comes from, which is what lets a reader rank two that disagree.
 *
 * One boss in 159 is told two things about the same weapon: Gargoyle Lord
 * Sirocco is a Beast, and Beasts are vulnerable to daggers, but it carries a
 * dagger resistance of its own. Both are true and the catalogue keeps both —
 * dropping the racial half would be editing the source rather than reading it,
 * and it is a fact worth showing that a boss resists what its race does not.
 *
 * The reading client ranks them: what a boss is told about itself outweighs
 * what it is told about its race. That rule needs this label to be expressible
 * without naming group numbers in the client.
 *
 * Classified by group, defaulting to `personal`. A racial group we have not
 * seen would be labelled personal and simply outrank more often, which is a
 * mild wrong; the reverse default would silently demote a real one.
 */
const SKILL_ORIGINS = { 4416: 'racial', 4414: 'armor' };

const originOf = (group) => SKILL_ORIGINS[group] ?? 'personal';

/**
 * The source separates `Crossbow` from `Bow` and each `Dual X` from its
 * one-handed form; the catalogue does not.
 *
 * Folding is lossless here rather than merely convenient: across the eighteen
 * racial traits a variant and its base appear together eight times and carry
 * the same value every time, so this deduplicates and never chooses.
 */
const WEAPON_ALIASES = {
  crossbow: 'bow',
  'dual sword': 'sword',
  'dual blunt': 'blunt',
  'dual dagger': 'dagger',
  'dual fist': 'fist',
};

const WEAPONS = new Set(['blunt', 'bow', 'dagger', 'fist', 'spear', 'sword']);
const ELEMENTS = new Set(['holy', 'dark', 'earth', 'wind', 'fire', 'water']);
/**
 * Condition labels as the source writes them, mapped onto the catalogue's
 * names. A map rather than a set for the sake of one entry: every subject the
 * catalogue stores becomes an enumeration value in the content type and a
 * member of a union in the reading client, and `speed down` is the only one the
 * source states with a space in it.
 */
const CONDITIONS = {
  bleed: 'bleed',
  debuffs: 'debuffs',
  derangement: 'derangement',
  hold: 'hold',
  knockback: 'knockback',
  poison: 'poison',
  shock: 'shock',
  sleep: 'sleep',
  'speed down': 'speedDown',
};

/** Statistic labels as the source writes them, mapped onto the catalogue's names. */
const STATS = {
  'p. def.': 'pDef',
  'm. def.': 'mDef',
  'p. atk.': 'pAtk',
  'm. atk.': 'mAtk',
  'max hp': 'maxHp',
  'hp recovery': 'hpRecovery',
  accuracy: 'acc',
  evasion: 'eva',
  speed: 'speed',
  'atk. spd.': 'atkSpd',
  'attack range': 'attackRange',
  'critical damage': 'critDamage',
  'p. crit. rate': 'pCritRate',
  'p. skill evasion': 'pSkillEva',
  'm. skill evasion': 'mSkillEva',
  'received p. crit. rate': 'receivedPCritRate',
  'received p. crit. damage': 'receivedPCritDamage',
  'received m. crit. damage': 'receivedMCritDamage',
  'vampiric rage effect': 'vampiricRage',
  'skills vampiric effect': 'vampiricSkills',
};

const canonicalWeapon = (subject) => WEAPON_ALIASES[subject] ?? subject;

/**
 * One description line into a modifier, or null if it is not one.
 *
 * Two shapes are recognised. `Resistance to Spear +10%` and `P. Def. -5%` state
 * an amount. `Resistant to Dagger/Rapier attacks.` and `Vulnerable to Blunt
 * Weapons.` state only a direction, and carry the skill's level as their
 * amount — see design.md for why that rather than a null.
 */
const parseLine = (line, level) => {
  const numbered = line.match(/^(.+?)\s*([+-])([\d.]+)(%?)\.?$/);
  if (numbered) {
    const [, label, sign, amount, percent] = numbered;
    const value = Number(amount) * (sign === '-' ? -1 : 1);
    const unit = percent ? 'percent' : 'flat';
    const resistance = label.match(/^Resistance to (.+)$/i);

    if (resistance) {
      const subject = resistance[1].trim().toLowerCase();
      const weapon = canonicalWeapon(subject);
      if (WEAPONS.has(weapon)) return { kind: 'weapon', subject: weapon, value, unit };
      if (ELEMENTS.has(subject)) return { kind: 'element', subject, value, unit };
      if (CONDITIONS[subject])
        return { kind: 'condition', subject: CONDITIONS[subject], value, unit };

      return { kind: 'unknown', subject, value, unit };
    }

    const stat = STATS[label.trim().toLowerCase()];

    return stat ? { kind: 'stat', subject: stat, value, unit } : null;
  }

  // `Resistant to Dagger/Rapier attacks.` / `Highly resistant to Bow/Crossbows.`
  // / `Vulnerable to Blunt Weapons.` / `Vulnerable to Divinity attack.`
  const named = line.match(/^(?:Highly\s+)?(Resistant|Vulnerable)\s+to\s+(.+?)\.?$/i);
  if (!named) return null;

  const sign = /^resistant$/i.test(named[1]) ? 1 : -1;
  const subject = named[2]
    .toLowerCase()
    .replace(/\battacks?\b|\bweapons?\b|\bcrossbows\b/g, '')
    .replace(/divinity/, 'holy')
    .replace(/archery/, 'bow')
    .split('/')[0]
    .trim();

  const weapon = canonicalWeapon(subject);
  if (WEAPONS.has(weapon))
    return { kind: 'weapon', subject: weapon, value: sign * level, unit: 'level' };
  if (ELEMENTS.has(subject))
    return { kind: 'element', subject, value: sign * level, unit: 'level' };

  return { kind: 'unknown', subject, value: sign * level, unit: 'level' };
};

/**
 * A line into every modifier it states.
 *
 * One sentence can carry two: Queen Ant's own skill reads "Vulnerable to Fire
 * attacks but highly resistant to archery", which is a vulnerability and a
 * resistance joined by a conjunction. Read whole it is neither, and lands in
 * the catalogue as a subject named `fire  but highly resistant to archery`.
 */
const parseLines = (line, level) => {
  const clauses = line.split(/\s+but\s+/i);
  if (clauses.length === 1) {
    const single = parseLine(line, level);

    return single ? [single] : [];
  }

  // Only the first clause carries the verb in the source's phrasing; the rest
  // read as complete sentences of their own once capitalised away.
  return clauses
    .map((clause, index) => parseLine(index === 0 ? clause : clause.trim(), level))
    .filter(Boolean);
};

/** Every skill on one boss's page, with the modifiers its own level states. */
const parseBossSkills = (html) => {
  const start = html.indexOf('npc_skill_list');
  if (start === -1) return [];

  const block = html.slice(start, html.indexOf('</section>', start));
  const skills = [];

  for (const part of block.split(/(?=<a href="\/[a-z0-9-]+\/skill\/)/)) {
    const link = part.match(/^<a href="\/[a-z0-9-]+\/skill\/(\d+)-([a-z0-9-]+)\/(\d+)"/);
    if (!link) continue;

    const [, group, slug, rawLevel] = link;
    if (EXCLUDED_GROUPS.has(group)) continue;

    const level = Number(rawLevel);
    const description = part.match(/skill_description">([\s\S]*?)<\/div>/)?.[1] ?? '';
    const lines = description
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map((line) => text(line))
      .filter(Boolean);

    // Folding `Crossbow` into `bow` makes a trait that states both say the same
    // thing twice. They are deduplicated, and a disagreement is an error rather
    // than a choice: the fold is only sound because the two always agree, and
    // the day they stop is the day this must be looked at again.
    const modifiers = [];
    const seen = new Map();

    for (const modifier of lines.flatMap((line) => parseLines(line, level))) {
      const subject = `${modifier.kind}:${modifier.subject}`;
      const previous = seen.get(subject);

      if (!previous) {
        seen.set(subject, modifier);
        modifiers.push(modifier);
        continue;
      }

      if (previous.value !== modifier.value || previous.unit !== modifier.unit) {
        throw new Error(
          `${group}-${level} states ${subject} twice and differently: ` +
            `${previous.value}${previous.unit} and ${modifier.value}${modifier.unit}`,
        );
      }
    }

    if (!modifiers.length) continue;

    skills.push({
      key: `${group}-${level}`,
      group,
      level,
      origin: originOf(group),
      slug,
      name: text(part.match(/item-name__content">\s*([^<]+?)\s*</)?.[1] ?? ''),
      icon: part.match(/\/i64\/([^"?]+)\.png/)?.[1] ?? null,
      modifiers,
    });
  }

  return skills;
};

module.exports = {
  WEAPONS,
  ELEMENTS,
  CONDITIONS,
  STATS,
  WEAPON_ALIASES,
  EXCLUDED_GROUPS,
  SKILL_ORIGINS,
  originOf,
  parseLine,
  parseLines,
  parseBossSkills,
};
