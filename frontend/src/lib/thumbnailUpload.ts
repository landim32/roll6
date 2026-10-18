import { imageService } from '../Services/imageService';

/**
 * Uploads a library card's picture (090) and returns its stored name, or undefined when it fails: a thumbnail never
 * blocks the save of a weapon or an animation — without one the card draws it live.
 */
export const uploadThumbnail = async (blob: Blob | null | undefined, name: string): Promise<string | undefined> => {
  if (!blob) return undefined;
  try {
    return (await imageService.upload(new File([blob], `${name}.png`, { type: 'image/png' }))).fileName;
  } catch {
    return undefined;
  }
};
