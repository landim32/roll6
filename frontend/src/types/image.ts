/** Image upload types. */

/** Result of an image upload. */
export interface ImageUploadInfo {
  /** File name to store in entities ({guid}.{ext}). */
  fileName: string;
  /** Temporary URL of the uploaded image. */
  url: string | null;
}

/** Kind of a character sheet file (022). */
export const SHEET_FILE_TYPE = { image: 'image', pdf: 'pdf' } as const;
export type SheetFileType = typeof SHEET_FILE_TYPE[keyof typeof SHEET_FILE_TYPE];

/** Result of a document upload (image or PDF stored exactly as sent). */
export interface DocumentUploadInfo {
  fileName: string;
  url: string | null;
  type: SheetFileType;
}
