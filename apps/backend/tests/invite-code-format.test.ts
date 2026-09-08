// The invite-code alphabet, its entropy and what a redeemer may mistype —
// specs/community-invites, "Codes resist guessing".
//
// Boots nothing: these are pure functions, and the properties worth asserting
// here are about the strings themselves.
import { describe, expect, it } from 'vitest';

import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateCode,
  normalizeCode,
} from '../src/helpers/invite-code';

describe('generateCode', () => {
  it('formats as three groups of four', () => {
    expect(generateCode()).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('uses only the unambiguous alphabet', () => {
    const characters = new Set(
      Array.from({ length: 500 }, () => generateCode().replaceAll('-', '')).join(''),
    );

    for (const character of characters) {
      expect(CODE_ALPHABET).toContain(character);
    }
  });

  it('excludes the characters that are misread for one another', () => {
    // The point of the alphabet: a code read off a screen and typed elsewhere
    // must not depend on telling O from 0 or I from 1.
    for (const character of ['0', 'O', '1', 'I', 'L', 'U']) {
      expect(CODE_ALPHABET).not.toContain(character);
    }
  });

  it('is unique across a large sample', () => {
    const sample = Array.from({ length: 20_000 }, generateCode);

    expect(new Set(sample).size).toBe(sample.length);
  });

  it('draws every character of the alphabet, so no symbol is unreachable', () => {
    // Guards against a generator that silently uses a subset — a modulo over
    // random bytes, say, which would still look random and still pass the
    // uniqueness check while costing entropy.
    const seen = new Set(
      Array.from({ length: 5000 }, () => generateCode().replaceAll('-', '')).join(''),
    );

    expect(seen.size).toBe(CODE_ALPHABET.length);
  });
});

describe('normalizeCode', () => {
  it('accepts the code exactly as it is issued', () => {
    const code = generateCode();

    expect(normalizeCode(code)).toBe(code);
  });

  it('accepts lower case, spaces and other separators', () => {
    const code = generateCode();
    const mangled = code.toLowerCase().replaceAll('-', ' ');

    expect(normalizeCode(mangled)).toBe(code);
    expect(normalizeCode(code.replaceAll('-', ''))).toBe(code);
  });

  it('rejects anything that is not a full code', () => {
    const code = generateCode();

    expect(normalizeCode('')).toBe('');
    expect(normalizeCode(code.slice(0, 8))).toBe('');
    expect(normalizeCode(`${code}X`)).toBe('');
  });

  it('drops characters outside the alphabet rather than guessing at them', () => {
    // `0`, `O`, `1` and `I` are not in the alphabet, so a code carrying one is
    // wrong however it is read. Dropping them leaves the string short, which
    // fails the length check — better than mapping one wrong code onto another
    // that might exist.
    const code = generateCode();

    expect(normalizeCode(code.replace(code[0], '0'))).toBe('');
    expect(normalizeCode(`${code}0`.replaceAll('-', ''))).toBe(code);
  });

  it('reads a code of exactly CODE_LENGTH characters', () => {
    expect(generateCode().replaceAll('-', '')).toHaveLength(CODE_LENGTH);
  });
});
