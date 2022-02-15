export type Quality = 'none' | 'blue' | 'red' | 'purple';

export interface BossApiResponse {
  id: string;
  name: string;
  quality: Quality;
  interval: number;
  chance: number;
  time: string;
  approximately: boolean;
  alliance: boolean;
  world: boolean;
  restarted: boolean;
  firstInterval?: number;
}

export interface Boss extends BossApiResponse {
  respawnTime: number;
}
