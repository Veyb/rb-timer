/**
 * Generating and reading invite codes.
 *
 * Pure functions with no Strapi dependency, so the properties that matter —
 * the alphabet, the entropy, what a redeemer is allowed to mistype — can be
 * tested without booting anything.
 */

import { randomInt } from 'node:crypto';

/**
 * Thirty characters, chosen so no two of them are confusable when a code is
 * read off a screen and typed into a phone: no `0`/`O`, no `1`/`I`/`L`, and no
 * `U` (which is easily read as `V` in several of the fonts this ends up in).
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

const GROUP_SIZE = 4;
const GROUP_COUNT = 3;

/** Characters in a code, separators excluded. */
export const CODE_LENGTH = GROUP_SIZE * GROUP_COUNT;

/**
 * A fresh code, e.g. `7K2P-4M9X-QRTF`.
 *
 * `randomInt` is a CSPRNG and rejects the biased tail of the range rather than
 * taking a byte modulo the alphabet, so every character is uniform. Twelve
 * characters over thirty symbols is a little under 59 bits — far past what an
 * endpoint that is rate-limited per account can be walked through.
 */
export const generateCode = (): string => {
  const characters = Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  );

  return Array.from({ length: GROUP_COUNT }, (_, group) =>
    characters.slice(group * GROUP_SIZE, (group + 1) * GROUP_SIZE).join(''),
  ).join('-');
};

/**
 * What a submitted code is compared against.
 *
 * Case and separators are the redeemer's business, not the code's: someone
 * pasting `7k2p 4m9x qrtf` from a chat message means the same code. Characters
 * outside the alphabet are dropped rather than mapped to a look-alike — the
 * alphabet has no `0`, `O`, `1`, `I`, `L` or `U` to map onto, so a code
 * carrying one is a typo whichever way it is read, and guessing at the
 * intention would only make one wrong code silently become another.
 */
export const normalizeCode = (input: string): string => {
  const characters = input
    .toUpperCase()
    .split('')
    .filter((character) => CODE_ALPHABET.includes(character));

  if (characters.length !== CODE_LENGTH) return '';

  return Array.from({ length: GROUP_COUNT }, (_, group) =>
    characters.slice(group * GROUP_SIZE, (group + 1) * GROUP_SIZE).join(''),
  ).join('-');
};
