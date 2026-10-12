/** NPC types — mirror the backend Npc, CampaignNpc and MapNpc DTOs (feature 013). */
import type { Posture } from './mapToken';

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
  /** Free-text condition; each new map occurrence starts with it. */
  status: string | null;
  /** Posture each new map occurrence starts with (031): standing, down or out of combat. */
  posture: Posture;
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
  status: string | null;
  /** Posture each new map occurrence starts with; the backend takes an omitted one as standing. */
  posture: Posture;
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
  /** Active instances across the campaign's maps (051): how many pieces "Retirar da campanha" removes. */
  mapNpcCount: number;
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
  /** Current values of this occurrence (026); 0 or below is allowed. Posture is separate. */
  currentLife: number;
  currentEnergy: number;
  /** The NPC's totals. */
  totalLife: number;
  totalEnergy: number;
  status: string | null;
  /** Standing, down or out of combat (031). */
  posture: Posture;
  /** Deslocamento of this instance (051). */
  currentMove: number;
  tokenId: number | null;
  tokenImageUrl: string | null;
  x: number | null;
  y: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Changes to one instance (051): the whole set; `currentMove` null keeps it. */
export interface MapNpcUpdateInfo {
  name: string;
  currentLife: number;
  currentEnergy: number;
  currentMove: number | null;
  status: string | null;
  posture: Posture | null;
}

/** New occurrence (and piece) of a campaign NPC on a free hex (column/row, odd-q). */
export interface MapNpcInsertInfo {
  mapId: number;
  npcId: number;
  /** Column/row of the piece; omit both (052) and the server takes the free hex nearest to the middle of the map. */
  x?: number;
  y?: number;
  look: number | null;
}
