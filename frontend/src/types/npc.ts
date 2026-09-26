/** NPC types — mirror the backend Npc, CampaignNpc and MapNpc DTOs (feature 013). */

/** NPC of the logged user's library. */
export interface NpcInfo {
  npcId: number;
  userId: number;
  /** Library token of the NPC's pieces (required). */
  tokenId: number;
  tokenName: string;
  /** Presigned URL of the token's standing image. */
  tokenImageUrl: string | null;
  name: string;
  life: number;
  energy: number;
  move: number;
  sheet: string | null;
  /** Stored file name ({guid}.{ext}). */
  image: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** NPC create/update payload. */
export interface NpcInsertInfo {
  tokenId: number;
  name: string;
  life: number;
  energy: number;
  move: number;
  sheet: string | null;
  image: string | null;
}

/** An NPC available in a campaign, with the NPC's data (master only). */
export interface CampaignNpcInfo {
  campaignNpcId: number;
  campaignId: number;
  npcId: number;
  name: string;
  tokenId: number;
  tokenImageUrl: string | null;
  imageUrl: string | null;
  life: number;
  energy: number;
  move: number;
  createdAt: string;
}

export interface CampaignNpcInsertInfo {
  campaignId: number;
  npcId: number;
}

/** One occurrence of an NPC on a map, with its piece. */
export interface MapNpcInfo {
  mapNpcId: number;
  mapId: number;
  npcId: number;
  mapTokenId: number | null;
  name: string;
  life: number;
  energy: number;
  status: string | null;
  tokenId: number | null;
  tokenImageUrl: string | null;
  x: number | null;
  y: number | null;
  createdAt: string;
  updatedAt: string;
}

/** New occurrence (and piece) of a campaign NPC on a free hex (column/row, odd-q). */
export interface MapNpcInsertInfo {
  mapId: number;
  npcId: number;
  x: number;
  y: number;
  look: number | null;
}
