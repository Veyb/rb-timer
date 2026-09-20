// A progress line for the passes that take minutes.
//
// Two behaviours, because these are read two ways. In a terminal it rewrites
// one line in place, so a ten-minute pass shows a live count without scrolling
// anything away. Redirected to a file — which is what happens when a pass is
// run in the background — carriage returns would leave one unreadable line, so
// it prints a fresh line every so often instead.
//
// The estimate is deliberately coarse. These passes pause between requests by a
// random amount, so anything more precise than "about six minutes" would be
// made up.

const PERIODIC_EVERY = 20;

const duration = (ms) => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`;
};

/**
 * @param {number} total
 * @param {string} label  what is being counted, for the finished line
 */
const createProgress = (total, label) => {
  const started = Date.now();
  const live = Boolean(process.stderr.isTTY);
  let done = 0;

  /** @param {string} [what]  the name of the thing just finished */
  const tick = (what = '') => {
    done++;
    const elapsed = Date.now() - started;
    const left = done < total ? (elapsed / done) * (total - done) : 0;
    const line =
      `  ${String(done).padStart(String(total).length)}/${total}` +
      `  ${String(Math.round((done / total) * 100)).padStart(3)}%` +
      (left ? `  ~${duration(left)} left` : '') +
      (what ? `  ${what}` : '');

    if (live) {
      // Padded to clear a longer previous name, and kept off stdout so that a
      // redirected run's output stays parseable.
      process.stderr.write(`\r${line.padEnd(78).slice(0, 78)}`);
    } else if (done % PERIODIC_EVERY === 0 || done === total) {
      process.stderr.write(`${line}\n`);
    }
  };

  const finish = () => {
    if (live) process.stderr.write(`\r${' '.repeat(79)}\r`);
    console.info('  %d %s in %s', done, label, duration(Date.now() - started));
  };

  return { tick, finish };
};

module.exports = { createProgress };
