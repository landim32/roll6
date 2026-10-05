import { imageService } from '../Services/imageService';
import { cropToFile } from './cropImage';
import type { CropArea } from './cropImage';
import { FRONT_IMAGE_SIZE } from './frontImage';

/**
 * Uploads one of the four "2,5D" images (035) cropped as chosen, at its fixed 3:4 portrait size and with the rotation
 * picked in the cropper; the margin around the character stays transparent. Returns the stored file name.
 */
export const uploadSpriteImage = async (crop: { src: string; area: CropArea; rotation: number }): Promise<string> =>
  (await imageService.upload(
    await cropToFile(crop.src, crop.area, { exactSize: FRONT_IMAGE_SIZE, rotation: crop.rotation, name: 'sprite' }),
  )).fileName;
