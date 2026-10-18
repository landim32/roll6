import type { ImageCrop } from '../components/ui/ImageCropper';
import { cropToFile } from './cropImage';
import { imageService } from '../Services/imageService';

/** The campaign's picture is wide like its library card (090): 16:9, at most 1280 × 720. */
export const CAMPAIGN_IMAGE_ASPECT = 16 / 9;
export const CAMPAIGN_IMAGE_WIDTH = 1280;

/** The output size of a crop: as wide as the crop (never upscaled) up to 1280, at 16:9. */
export const campaignImageSize = (cropWidth: number): { width: number; height: number } => {
  const width = Math.max(1, Math.min(CAMPAIGN_IMAGE_WIDTH, Math.round(cropWidth)));
  return { width, height: Math.round(width / CAMPAIGN_IMAGE_ASPECT) };
};

/** Crops the chosen picture and uploads it; returns the stored name. */
export const uploadCampaignImage = async (crop: ImageCrop): Promise<string> => {
  const file = await cropToFile(crop.src, crop.area, {
    exactSize: campaignImageSize(crop.area.width),
    rotation: crop.rotation,
    name: 'campaign',
  });
  return (await imageService.upload(file)).fileName;
};
