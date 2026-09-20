// The two world maps, and the dungeon plans that sit on the first.
//
// The catalogue holds two because it holds two sets of coordinates, measured
// against different pictures, and neither can be read against the other.
//
// `MAP_IMAGE` and the plans below were assembled by hand and the source
// publishes neither, so a refresh leaves them untouched. `WIKI_MAP_IMAGE` comes
// from the source and is what `wikiX`/`wikiY` are pixels of; the map refresh
// fetches it once.

import type { DungeonPlan } from './types';

/** 3072x4096. `mapX`/`mapY` and every `DungeonPlan` below are measured on this. */
export const MAP_IMAGE = 'images/world-map/map-c7.webp';

/**
 * 3004x3004. A boss's `wikiX`/`wikiY` are the `left` and `top` of its pin in
 * this image's pixels.
 *
 * The size is the file's own and is not written down beside it, for the same
 * reason `MAP_IMAGE` has no size of its own: a number kept next to a picture can
 * disagree with the picture. `refresh-map.js` does carry a 3004, but that one
 * has a different job — it refuses the source's pins if the source has stopped
 * drawing them on a 3004-pixel map.
 */
export const WIKI_MAP_IMAGE = 'images/world-map/wiki-map.webp';

export const DUNGEON_PLANS: Record<string, DungeonPlan> = {
  'elven-ruins': {
    name: 'Elven Ruins',
    mapX: 1295.7,
    mapY: 3785,
    width: 54.3,
    height: 51.9,
    image: 'images/dungeon-plans/elven-ruins.webp',
  },
  'elven-fortress': {
    name: 'Elven Fortress',
    mapX: 1032.7,
    mapY: 2489.7,
    width: 149.8,
    height: 109.3,
    image: 'images/dungeon-plans/elven-fortress.webp',
  },
  'school-of-dark-arts': {
    name: 'School of Dark Arts',
    mapX: 600.4,
    mapY: 2281.8,
    width: 58.7,
    height: 115.9,
    image: 'images/dungeon-plans/school-of-dark-arts.webp',
  },
  'forgotten-temple': {
    name: 'Forgotten Temple',
    mapX: 513.7,
    mapY: 3304.9,
    width: 71.8,
    height: 91.7,
    image: 'images/dungeon-plans/forgotten-temple.webp',
  },
  'cruma-tower-3rd-floor': {
    name: 'Cruma Tower: 3rd Floor',
    mapX: 1067.1,
    mapY: 2767.5,
    width: 102.8,
    height: 102.9,
    image: 'images/dungeon-plans/cruma-tower-3rd-floor.webp',
  },
  'garden-of-eva': {
    name: 'Garden of Eva',
    mapX: 1553.2,
    mapY: 3768.4,
    width: 104.2,
    height: 135.9,
    image: 'images/dungeon-plans/garden-of-eva.webp',
  },
  'devil-s-isle': {
    name: "Devil's Isle",
    mapX: 1291.5,
    mapY: 3445.4,
    width: 116.2,
    height: 177.8,
    image: 'images/dungeon-plans/devil-s-isle.webp',
  },
  'cruma-tower-2nd-floor': {
    name: 'Cruma Tower: 2nd Floor',
    mapX: 1069.6,
    mapY: 2773.5,
    width: 97.8,
    height: 88.2,
    image: 'images/dungeon-plans/cruma-tower-2nd-floor.webp',
  },
  'the-giant-s-cave': {
    name: "The Giant's Cave",
    mapX: 2287.4,
    mapY: 2324.7,
    width: 158.9,
    height: 111.4,
    image: 'images/dungeon-plans/the-giant-s-cave.webp',
  },
  'tower-of-insolence-floor-1': {
    name: 'Tower of Insolence: Floor 1',
    mapX: 1814.3,
    mapY: 2049.6,
    width: 64.9,
    height: 65.3,
    image: 'images/dungeon-plans/tower-of-insolence-floor-1.webp',
  },
  'antharas-lair': {
    name: "Antharas' Lair",
    mapX: 1998.4,
    mapY: 2763.2,
    width: 152.9,
    height: 116.7,
    image: 'images/dungeon-plans/antharas-lair.webp',
  },
  'tower-of-insolence-floor-6': {
    name: 'Tower of Insolence: Floor 6',
    mapX: 1815.6,
    mapY: 2058.6,
    width: 52.4,
    height: 48.9,
    image: 'images/dungeon-plans/tower-of-insolence-floor-6.webp',
  },
  'tower-of-insolence-floor-3': {
    name: 'Tower of Insolence: Floor 3',
    mapX: 1817.8,
    mapY: 2060.7,
    width: 57.8,
    height: 42.8,
    image: 'images/dungeon-plans/tower-of-insolence-floor-3.webp',
  },
  'cruma-tower-1st-floor': {
    name: 'Cruma Tower: 1st Floor',
    mapX: 1107.5,
    mapY: 2773.6,
    width: 21.9,
    height: 81.1,
    image: 'images/dungeon-plans/cruma-tower-1st-floor.webp',
  },
  'the-ant-nest': {
    name: 'The Ant Nest',
    mapX: 746.3,
    mapY: 3259.8,
    width: 167.9,
    height: 169.6,
    image: 'images/dungeon-plans/the-ant-nest.webp',
  },
};
