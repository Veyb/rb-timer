export type Rank = 'common' | 'rare' | 'unique' | 'epic' | 'legend';
export type ItemType =
  | 'sword'
  | 'dualblades'
  | 'dagger'
  | 'bow'
  | 'orb'
  | 'staff'
  | 'upper'
  | 'lower'
  | 'gloves'
  | 'shoes'
  | 'helm'
  | 'cloak'
  | 'shirt'
  | 'sigil'
  | 'necklace'
  | 'earring'
  | 'ring'
  | 'belt'
  | 'bracelet';

export interface ImageType {
  url: string;
  width: number;
  height: number;
}

export interface Item {
  id: number;
  name: string;
  rank: Rank;
  type: ItemType;
  image: ImageType | null;
}

export interface Effect {
  id: number;
  name: string;
  value: number;
  unit?: string;
}

export interface CollectionItem {
  id: number;
  enhancement: number;
  item: Item;
}

export interface Collection {
  id: number;
  name: string;
  rank: Rank;
  effects: Effect[];
  items: CollectionItem[];
}
