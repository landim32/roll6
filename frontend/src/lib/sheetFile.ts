import { SHEET_FILE_TYPE } from '../types/image';
import type { SheetFileType } from '../types/image';

/** Character sheet file (022): an image or a PDF, stored exactly as uploaded (same rules as the backend). */
export const ACCEPTED_SHEET_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export const SHEET_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf';
export const MAX_SHEET_FILE_BYTES = 10 * 1024 * 1024;

const EXTENSION_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf',
};

export type SheetFileError = 'type' | 'tooLarge';

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

/** Some systems send no MIME type: fall back to the extension. */
export const sheetFileMimeType = (file: Pick<File, 'name' | 'type'>): string =>
  file.type || EXTENSION_TYPES[extensionOf(file.name)] || '';

/** Validates a chosen file before uploading it. Returns the error code or null. */
export const validateSheetFile = (file: Pick<File, 'name' | 'type' | 'size'>): SheetFileError | null => {
  if (!ACCEPTED_SHEET_TYPES.includes(sheetFileMimeType(file))) return 'type';
  if (file.size > MAX_SHEET_FILE_BYTES) return 'tooLarge';
  return null;
};

/** "pdf" for .pdf, "image" otherwise, null without a file. */
export const sheetFileTypeOf = (fileName: string | null | undefined): SheetFileType | null => {
  if (!fileName) return null;
  return extensionOf(fileName) === 'pdf' ? SHEET_FILE_TYPE.pdf : SHEET_FILE_TYPE.image;
};
