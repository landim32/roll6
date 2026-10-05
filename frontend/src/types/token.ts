/** Token library types — mirror the backend Token DTOs. */

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
}
