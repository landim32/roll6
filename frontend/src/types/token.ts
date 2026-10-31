/** Token library types — mirror the backend Token DTOs. */
import type { TokenWeapon, TokenWeaponWrite } from './weapon';

/** A library token (standing/lying images and the space each state takes). */
export interface TokenInfo {
  tokenId: number;
  userId: number;
  name: string;
  description: string | null;
  upSpace: number;
  /** Null when the token has no lying-down state. */
  downSpace: number | null;
  /** Stored file names ({guid}.{ext}). */
  upImage: string | null;
  downImage: string | null;
  /** "2,5D frente" (034): the figure seen from the front, used by the 3D view. */
  frontImage: string | null;
  /** "2,5D direita" (035): in profile, looking to the right of the image. */
  rightImage: string | null;
  /** "2,5D esquerda" (035): in profile, looking to the left of the image. */
  leftImage: string | null;
  /** "2,5D costas" (035): seen from behind. */
  backImage: string | null;
  /** Presigned URLs for display. */
  upImageUrl: string | null;
  downImageUrl: string | null;
  frontImageUrl: string | null;
  rightImageUrl: string | null;
  leftImageUrl: string | null;
  backImageUrl: string | null;
  /** 3D model (055): stored `{guid}.glb` and its presigned URL; missing/null = no model. */
  modelFile?: string | null;
  modelFileUrl?: string | null;
  /** Animation chosen for each state of the model (056): null = automatic, "none", "clip:{name}" or "animation:{id}". */
  modelIdleClip?: string | null;
  modelWalkClip?: string | null;
  /** The death (058): played once when the piece is down or out of combat; null = automatic. */
  modelDownClip?: string | null;
  /** Size of the model in the 3D view (063): percent of its automatic height, 25–400; missing = 100. */
  modelScale?: number;
  /** Which side of a model without a skeleton is its front (106): 0 (+Z), 90 (+X), 180 (−Z) or 270 (−X); missing = 0. */
  modelFront?: number;
  /** Weapons in the model's sockets (083): the weapon's name, file, grip point and pose, and the socket's grip; missing = none. */
  weapons?: TokenWeapon[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Token create payload. */
export interface TokenInsertInfo {
  name: string;
  description: string | null;
  upSpace: number | null;
  downSpace: number | null;
  upImage: string | null;
  downImage: string | null;
  frontImage: string | null;
  rightImage: string | null;
  leftImage: string | null;
  backImage: string | null;
  /** 3D model (055); the PUT replaces every field, so null removes it. */
  modelFile: string | null;
  /** Animations chosen for the model (056; `lib/modelAnimations`): null = automatic; the PUT resets what it doesn't get. */
  modelIdleClip: string | null;
  modelWalkClip: string | null;
  modelDownClip: string | null;
  /** Size of the model (063), 25–400 in steps of 5; the PUT resets it to 100 when omitted. */
  modelScale: number;
  /** Front of a model without a skeleton (106): 0, 90, 180 or 270; the PUT resets it to 0 when omitted. */
  modelFront: number;
  /** Weapons in the model's sockets (083): `{ socket, weaponId, grip }` each; the PUT empties a socket it doesn't get. */
  weapons: TokenWeaponWrite[];
}

/** Result of POST /api/model (055): the stored `.glb` name and a temporary URL. */
export interface ModelUploadInfo {
  fileName: string;
  url: string | null;
}
