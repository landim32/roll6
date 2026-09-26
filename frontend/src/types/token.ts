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
  /** Presigned URLs for display. */
  upImageUrl: string | null;
  downImageUrl: string | null;
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
}
