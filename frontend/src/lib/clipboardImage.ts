/** Pasting a picture into the chat (044): which clipboard item becomes the photo. */

export const CLIPBOARD_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];

export interface ClipboardItemLike {
  kind: string;
  type: string;
  getAsFile: () => File | null;
}

export interface ClipboardImagePick {
  /** The first supported picture, or null. */
  file: File | null;
  /** There were pictures, none in a supported format. */
  unsupported: boolean;
  /** Pictures beyond the one used. */
  extra: number;
}

export const pickClipboardImage = (items: ArrayLike<ClipboardItemLike>): ClipboardImagePick => {
  const images = Array.from(items).filter((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const supported = images.find((item) => CLIPBOARD_IMAGE_TYPES.includes(item.type));
  return {
    file: supported?.getAsFile() ?? null,
    unsupported: images.length > 0 && !supported,
    extra: Math.max(0, images.length - 1),
  };
};
