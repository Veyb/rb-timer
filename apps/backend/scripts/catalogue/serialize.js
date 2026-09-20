// Writes a JavaScript value back out as TypeScript source.
//
// Deliberately naive about layout: it emits one value per line and lets
// `biome format --write` settle the result afterwards, which is the only way to
// be sure the output matches what `pnpm check` will accept without
// reimplementing the formatter here.
//
// Two things it is not naive about. Keys that are not valid identifiers are
// quoted, because a location slug like `the-giant-s-cave` is a parse error
// unquoted. And strings are escaped for single quotes, since the repository
// formats with `quoteStyle: single` and 22 of the boss names carry an
// apostrophe.

const VALID_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const serialize = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';

    return `[\n${value.map((entry) => `${serialize(entry)},\n`).join('')}]`;
  }

  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) return '{}';

  return `{\n${entries
    .map(([key, entry]) => `${VALID_IDENT.test(key) ? key : quote(key)}: ${serialize(entry)},\n`)
    .join('')}}`;
};

/**
 * Replaces one `export const <name> ... = <value>;` in a source file, leaving
 * every other byte alone.
 *
 * Surgical on purpose: these data files carry a long header comment, other
 * exports and fields no refresh can see — imagery, coordinates, statistics —
 * and rewriting the file wholesale would be a standing invitation to lose them.
 */
const replaceExport = (source, name, value) => {
  const opening = source.indexOf(`export const ${name}`);
  if (opening === -1) throw new Error(`no export named ${name}`);

  const assign = source.indexOf('=', opening);
  if (assign === -1) throw new Error(`export ${name} has no assignment`);

  // The declaration ends at the `;` that closes it, found by walking the
  // brackets rather than by pattern — the values themselves contain both.
  let depth = 0;
  let inString = null;
  let end = -1;

  for (let i = assign + 1; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (char === '\\') i++;
      else if (char === inString) inString = null;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') inString = char;
    else if (char === '[' || char === '{' || char === '(') depth++;
    else if (char === ']' || char === '}' || char === ')') depth--;
    else if (char === ';' && depth === 0) {
      end = i;
      break;
    }
  }

  if (end === -1) throw new Error(`export ${name} is unterminated`);

  return `${source.slice(0, assign + 1)} ${serialize(value)}${source.slice(end)}`;
};

/**
 * Records in the file itself which copy of the source it was built from.
 *
 * The cache folder already carries the date, but the cache is scratch space
 * under `.tmp/` and the data files are what anybody actually opens. Without
 * this, "how old is this data" is a question you answer by remembering when you
 * last ran something.
 *
 * An exported constant rather than a comment, so the reader can pass it to the
 * seed and the age travels as far as the database.
 */
const stampSource = (source, copy) => {
  const line = `export const SOURCE_READ_ON = '${copy}';`;

  if (/export const SOURCE_READ_ON\s*=\s*'[^']*';/.test(source)) {
    return source.replace(/export const SOURCE_READ_ON\s*=\s*'[^']*';/, line);
  }

  const first = source.search(/^export const /m);
  if (first === -1) return `${source}\n${line}\n`;

  return `${source.slice(0, first)}/** The copy of the source this file was built from. */\n${line}\n\n${source.slice(first)}`;
};

module.exports = { serialize, replaceExport, stampSource };
