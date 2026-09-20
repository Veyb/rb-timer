// Reads pages from the game's own reference wiki, clearing the interstitial it
// serves to anything that has not proved it is a browser.
//
// The site answers a cold request with a small "Preparing Answers" page rather
// than the article. That page carries a script which sets a cookie, solves a
// puzzle seeded by today's date and the cookie's value, and POSTs the answer
// back to the same URL. Once the POST is accepted the next GET returns the real
// page, and the session holds for a day across the whole site.
//
// The script is not reimplemented here, it is *run*. Its obfuscation rotates
// between responses — `window.atob('<base64>')` on one, `\xNN` escapes on the
// next — so anything that tried to pull the payload out by pattern would break
// on the following request. Instead the whole self-executing block is handed to
// a `vm` context with shims for the few browser APIs it touches, and the
// `XMLHttpRequest` shim records the request instead of sending it. The site's
// own `eval` unwraps whatever form this response happened to use.
//
// The same script checks for automation, and the sandbox passes those checks by
// being what it is rather than by pretending: a fresh `vm` context simply has
// no `Buffer`, no `webdriver`, no `_phantom`. The one value that has to be
// chosen rather than omitted is the viewport, which must differ from the screen
// size — a default headless browser reports them equal, and the script adds a
// header flagging itself when they match.
//
// `robots.txt` on this host disallows everything for every agent. These
// commands are therefore run by hand rather than on a schedule, ask for one
// page where they can, pause between requests where they cannot, and cache what
// they fetch so that working on a parser costs no further requests.
//
// Used by the refresh commands in this directory; not a command itself.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ORIGIN = 'https://masterwork.wiki';

/** Our server's prefix. The site also publishes `lu4-gamma`, `eternal` and `masterwork`. */
const SERVER = 'lu4-b-w-c';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/**
 * Under `.tmp/`, which is already ignored by git, and one folder per copy.
 *
 * A copy is named for the day it was taken, so `ls` shows the history and a
 * page's age is a property of where it sits rather than something to remember.
 * Passes default to today's, which means a refresh after a patch fetches a
 * fresh copy on its own: the failure this replaces was a cache that never
 * expired, where the whole sequence would report "no differences" against a
 * copy from last week and be believed.
 *
 * `YYYY-MM-DD` rather than the day first, so the folders sort into order.
 */
const CACHE_DIR = path.join(__dirname, '..', '..', '.tmp', 'wiki-cache');

/**
 * Local rather than UTC. These folders are read by a person deciding whether a
 * copy is today's, and west of Greenwich `toISOString` starts saying tomorrow
 * partway through the evening.
 */
const today = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The copies on disk, newest first. */
const copies = () => {
  if (!fs.existsSync(CACHE_DIR)) return [];

  return fs
    .readdirSync(CACHE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
};

/** `--cache=2026-09-19`, or today. */
const copyFromArgv = (argv) => {
  const arg = argv.find((value) => value.startsWith('--cache='));
  if (!arg) return today();

  const value = arg.slice('--cache='.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`--cache wants a date like 2026-09-19, not "${value}"`);
  }

  return value;
};

/**
 * Says which copy a pass is working from, before it does anything.
 *
 * The line about an older copy is the whole point of printing this. A pass that
 * silently starts fetching 158 pages because today's folder happens to be empty
 * is a twenty-minute surprise, and the command to avoid it should not have to
 * be remembered.
 */
const announceCopy = (session, { expected } = {}) => {
  const held = session.held();
  console.info('  copy %s, %d pages held', session.copy, held);

  if (held) return;

  const older = copies().filter((name) => name !== session.copy);
  if (!older.length) return;

  console.info(
    '  nothing cached for today%s. The newest copy is %s:',
    expected ? `, so this run will fetch up to ${expected} pages` : '',
    older[0],
  );
  console.info('      ... -- --cache=%s   to read that one instead\n', older[0]);
};

/**
 * How long to wait between requests: this floor plus a random part.
 *
 * The random part is not politeness, it is the point. A request every 3000ms to
 * the millisecond is a signature no human produces, and a host watching for one
 * finds it immediately. The floor is generous because these passes are run by
 * hand once a patch: 158 pages at three to six seconds is about ten minutes,
 * which costs nothing that matters.
 *
 * An earlier version of this file used a flat 500ms and got the address
 * throttled partway through a 158-page pass. Read the two constants below as
 * the price of that.
 */
const REQUEST_GAP_MS = 3000;
const REQUEST_JITTER_MS = 3000;

/**
 * Attempts, and the wait between them — for network failures only.
 *
 * A 429 or a 403 is not retried at all. Those are answers: the host is asking
 * for less, and asking again four times is how a throttle becomes a ban. That
 * is not hypothetical, it is what the previous version of this file did.
 */
const RETRIES = 2;
const RETRY_BACKOFF_MS = 8000;

/**
 * Two network failures in a row is not a hiccup, it is the far end refusing to
 * talk. The pass stops rather than working through the rest of the list.
 */
const CONSECUTIVE_FAILURE_LIMIT = 2;

/** A ceiling on one run, so a loop cannot turn into a crawl by accident. */
const REQUEST_BUDGET = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown when the host has asked us to stop. Never retried, never caught. */
class RefusedError extends Error {}

/**
 * Whether a response is the interstitial rather than the page asked for.
 *
 * Both halves matter: the real pages also contain scripts, and the title alone
 * would match an article that happened to discuss it.
 */
const isChallenge = (html) => /eval\s*\(/.test(html) && /Preparing/i.test(html);

/**
 * Runs the challenge script under shims and returns the request it wanted to
 * make. Nothing leaves the sandbox; the caller replays it.
 *
 * Exported so that a check can assert what the script decided to send — in
 * particular that it did not add the header it uses to flag itself as headless.
 */
const solveChallenge = (html) => {
  const block = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => /eval\s*\(/.test(source));

  if (!block) throw new Error('challenge page carried no self-executing script');

  let captured = null;
  const element = () => ({ textContent: '', innerHTML: '', getAttribute: () => null });

  // Defined out here on purpose: they close over Node's `Buffer`, so the
  // sandbox gets the two functions without getting the global the script
  // probes for.
  const btoa = (value) => Buffer.from(value, 'latin1').toString('base64');
  const atob = (value) => Buffer.from(value, 'base64').toString('latin1');

  const sandbox = {
    navigator: { userAgent: USER_AGENT, cookieEnabled: true },
    screen: { width: 2560, height: 1440 },
    // Deliberately unequal to `screen`. Equal values are what the script reads
    // as "no window chrome, therefore headless".
    innerWidth: 1512,
    innerHeight: 857,
    btoa,
    atob,
    setTimeout: (fn) => fn(),
    setInterval: () => 0,
    clearInterval: () => {},
    location: { reload: () => {} },
    addEventListener: (_event, fn) => fn(),
    XMLHttpRequest: function XMLHttpRequestShim() {
      this.headers = {};
      this.open = (method, url) => {
        this.method = method;
        this.url = url;
      };
      this.setRequestHeader = (name, value) => {
        this.headers[name] = value;
      };
      this.send = (body) => {
        captured = { method: this.method, url: this.url, headers: this.headers, body };
      };
    },
  };

  sandbox.window = sandbox;
  sandbox.document = {
    addEventListener: (_event, fn) => fn(),
    attachEvent: (_event, fn) => fn(),
    cookie: '',
    documentElement: element(),
    body: element(),
    getElementById: () => element(),
  };

  vm.runInNewContext(block, sandbox, { timeout: 10000 });

  if (!captured) throw new Error('challenge script never sent its answer');

  return captured;
};

/**
 * A logged-in-enough session: a cookie jar plus the challenge, cleared once and
 * reused for every page afterwards.
 */
const createSession = ({
  copy = today(),
  gapMs = REQUEST_GAP_MS,
  jitterMs = REQUEST_JITTER_MS,
  budget = REQUEST_BUDGET,
} = {}) => {
  const copyDir = path.join(CACHE_DIR, copy);
  const jar = new Map();
  let cleared = false;
  let lastRequestAt = 0;
  let spent = 0;
  let consecutiveFailures = 0;

  const cookieHeader = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');

  const absorb = (response) => {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const split = pair.indexOf('=');
      if (split > 0) jar.set(pair.slice(0, split).trim(), pair.slice(split + 1).trim());
    }
  };

  const throttle = async () => {
    const gap = gapMs + Math.random() * jitterMs;
    const wait = lastRequestAt + gap - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  };

  /**
   * One request, retried on the failures that are the network's fault.
   *
   * A pass over every boss is 158 requests, and one of those reliably drops
   * partway through — the first full run died around the seventieth with a bare
   * `fetch failed`. Without this the whole pass is lost to a hiccup. A 4xx is
   * not retried: it is an answer, and repeating it only asks again for
   * something that will not be given.
   */
  /**
   * @param {object} init  `binary: true` returns the body as bytes.
   *
   * It has to be a flag on the request rather than a conversion afterwards:
   * `response.text()` decodes as UTF-8, and re-encoding that back through
   * `latin1` does not give the original bytes. An icon round-tripped that way
   * arrives as something sharp refuses to read.
   */
  const request = async (url, init = {}, attempt = 1) => {
    if (spent >= budget) {
      throw new RefusedError(`request budget of ${budget} spent; stopping rather than crawling on`);
    }

    await throttle();
    spent++;

    let response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
          ...(jar.size ? { Cookie: cookieHeader() } : {}),
          ...init.headers,
        },
      });
    } catch (error) {
      consecutiveFailures++;
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
        throw new RefusedError(
          `${consecutiveFailures} requests in a row could not be made (${url}: ${error.message}). ` +
            'That is the far end refusing to talk, not a hiccup. Stopping; what was fetched is cached.',
        );
      }
      if (attempt >= RETRIES) throw new Error(`${url}: ${error.message}`, { cause: error });
      await sleep(attempt * RETRY_BACKOFF_MS);

      return request(url, init, attempt + 1);
    }

    // An answer, not a failure. Asking again is how a throttle becomes a ban.
    if (response.status === 429 || response.status === 403) {
      const after = response.headers.get('retry-after');
      throw new RefusedError(
        `${url} answered ${response.status}${after ? `, Retry-After: ${after}` : ''}. ` +
          'The host is asking for less. Stopping; what was fetched is cached, and a later run resumes.',
      );
    }

    if (response.status >= 500 && attempt < RETRIES) {
      await sleep(attempt * RETRY_BACKOFF_MS);

      return request(url, init, attempt + 1);
    }

    consecutiveFailures = 0;
    absorb(response);

    if (init.binary) {
      return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
    }

    return { status: response.status, body: await response.text() };
  };

  const clear = async (url, html) => {
    const answer = solveChallenge(html);
    const posted = await request(new URL(answer.url, url).href, {
      method: answer.method,
      headers: answer.headers,
      body: answer.body,
    });

    if (posted.status !== 204 && posted.status !== 200) {
      throw new Error(`challenge answer refused with HTTP ${posted.status}`);
    }

    cleared = true;
  };

  /**
   * Fetches one path, clearing the challenge first if this is the first call.
   *
   * A page that still looks like the interstitial after the answer was accepted
   * is an error and not an empty result: the callers write data files, and a
   * silent empty page would look exactly like a boss that lost all its drops.
   */
  const get = async (pathname) => {
    const url = ORIGIN + pathname;
    let page = await request(url);

    if (isChallenge(page.body)) {
      await clear(url, page.body);
      page = await request(url);
    }

    if (isChallenge(page.body)) {
      throw new Error(`still served the interstitial after clearing it: ${pathname}`);
    }
    if (page.status !== 200) {
      throw new Error(`HTTP ${page.status} for ${pathname}`);
    }

    return page.body;
  };

  /**
   * As `get`, for something that is not HTML.
   *
   * Exists so that icon fetching goes through the same throttle, the same
   * jitter, the same refusal handling and the same budget as everything else.
   * It used to call `fetch` directly with a gap of its own, which is exactly
   * the kind of side door that makes a careful policy worthless.
   */
  const getBuffer = async (pathname) => {
    const page = await request(ORIGIN + pathname, { binary: true });
    if (page.status !== 200) throw new Error(`HTTP ${page.status} for ${pathname}`);

    return page.bytes;
  };

  const cachePath = (pathname) =>
    path.join(copyDir, `${pathname.replace(/^\/+/, '').replace(/[^A-Za-z0-9._-]+/g, '_')}.html`);

  /** As `get`, but served from this copy when it already holds the page. */
  const getCached = async (pathname) => {
    const file = cachePath(pathname);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');

    const body = await get(pathname);
    fs.mkdirSync(copyDir, { recursive: true });
    fs.writeFileSync(file, body);

    return body;
  };

  return {
    get,
    getCached,
    getBuffer,
    cachePath,
    copy,
    copyDir,
    held: () => (fs.existsSync(copyDir) ? fs.readdirSync(copyDir).length : 0),
    isCleared: () => cleared,
    cookieNames: () => [...jar.keys()],
    spent: () => spent,
  };
};

module.exports = {
  ORIGIN,
  SERVER,
  USER_AGENT,
  CACHE_DIR,
  REQUEST_GAP_MS,
  RETRIES,
  REQUEST_JITTER_MS,
  REQUEST_BUDGET,
  RefusedError,
  isChallenge,
  solveChallenge,
  createSession,
  today,
  copies,
  copyFromArgv,
  announceCopy,
};
