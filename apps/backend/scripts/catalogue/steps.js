// What to run next, in one place.
//
// The order is not guessable from the commands themselves and getting it wrong
// is quiet rather than loud: `refresh:skills` reads the boss pages that
// `refresh:profile` fetches, so running it first builds the skills from
// whatever copy happens to be on disk, and `refresh:drops` renames items and
// boss slugs, so running it after the others makes them describe records that
// no longer exist under those names.
//
// So each pass ends by naming the command that follows it. Kept here rather
// than in each script because a chain written down in five places is a chain
// that disagrees with itself within a month.

const RUN = 'pnpm --filter backend';

/**
 * The passes, in order. `after` is what to run once this one has been applied.
 */
const CHAIN = [
  { id: 'drops', apply: 'refresh:drops:write', did: 'written', after: 'refresh:profile' },
  { id: 'profile', apply: 'refresh:profile:write', did: 'written', after: 'refresh:skills' },
  { id: 'skills', apply: 'refresh:skills:write', did: 'written', after: 'refresh:map' },
  { id: 'map', apply: 'refresh:map:write', did: 'written', after: 'refresh:gamma' },
  // The other server, which moves rarely. Its bosses are read only where the
  // two servers disagree, so this costs a handful of pages rather than 158.
  {
    id: 'gamma',
    apply: 'refresh:gamma:write',
    did: 'written',
    after: 'build && pnpm --filter backend seed:catalog',
  },
  { id: 'seed', apply: null, did: 'written', after: 'prune:catalog' },
  { id: 'prune', apply: 'prune:catalog:delete', did: 'removed', after: null },
];

const stepOf = (id) => {
  const step = CHAIN.find((entry) => entry.id === id);
  if (!step) throw new Error(`no step called ${id}`);

  return step;
};

/**
 * Closes a report with the command that comes next.
 *
 * @param {string} id      which pass just ran
 * @param {boolean} applied  whether it wrote anything, or only reported
 */
const nextStep = (id, applied) => {
  const step = stepOf(id);

  if (!applied && step.apply) {
    console.info('\nnothing %s. Apply with:\n    %s %s', step.did, RUN, step.apply);

    return;
  }

  if (!step.after) {
    console.info('\nthat is the last step. The catalogue matches the source.');

    return;
  }

  console.info('\nnext:\n    %s %s', RUN, step.after);
};

module.exports = { CHAIN, RUN, nextStep };
