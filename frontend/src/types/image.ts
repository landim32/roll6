/** Image upload types. */

/** Result of an image upload. */
export interface ImageUploadInfo {
  /** File name to store in entities ({guid}.{ext}). */
  fileName: string;
  /** Temporary URL of the uploaded image. */
  url: string | null;
}
