import type { SheetFileType } from './image';

/** Character types — mirror the backend Character DTOs. */

/** Character of the logged user (full data). */
export interface CharacterInfo {
  characterId: number;
  userId: number;
  name: string;
  sheet: string | null;
  life: number;
  energy: number;
  move: number;
  /** Stored file name ({guid}.{ext}). */
  image: string | null;
  /** Presigned URL for display. */
  imageUrl: string | null;
  /** Stored sheet file (image or PDF, 022). */
  sheetFile: string | null;
  /** Presigned URL of the sheet file. */
  sheetFileUrl: string | null;
  sheetFileType: SheetFileType | null;
  /** Library token placed on the map when the character is dragged there. */
  tokenId: number | null;
  tokenName: string | null;
  /** Presigned URL of the token's standing image. */
  tokenImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Character create/update payload. */
export interface CharacterInsertInfo {
  name: string;
  sheet: string | null;
  life: number;
  energy: number;
  move: number;
  image: string | null;
  tokenId: number | null;
  /** Sheet file (image or PDF) from the document upload; null removes it (022). */
  sheetFile: string | null;
}

/** Any user's character in the invite search (public fields only). */
export interface CharacterSearchInfo {
  characterId: number;
  name: string;
  imageUrl: string | null;
  ownerId: number;
  ownerName: string;
}

/** Transfers a character to the user with this e-mail (021). */
export interface CharacterTransferInfo {
  email: string;
}
