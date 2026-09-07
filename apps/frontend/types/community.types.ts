/** Game servers a community can belong to. Mirrors the backend enumeration. */
export type GameServer = 'Gamma' | 'Black' | 'White' | 'Carmine' | 'MasterWork';

/** The upload entity behind `Community.logo`, narrowed to what the UI reads. */
export interface CommunityLogo {
  id: number;
  url: string;
  /** Null for formats without intrinsic dimensions, SVG above all. */
  width: number | null;
  height: number | null;
  alternativeText: string | null;
}

/**
 * Reaches the frontend only through `/users/me`, populated onto the current
 * user. The community collection itself has no Content API route: communities
 * are created and assigned from the Strapi admin panel.
 */
export interface Community {
  id: number;
  documentId: string;
  name: string;
  server: GameServer;
  logo: CommunityLogo | null;
}
