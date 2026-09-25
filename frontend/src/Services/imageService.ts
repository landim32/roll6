import type { ImageUploadInfo } from '../types/image';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/image`;

/** Accepted image types and size (same rules as the backend). */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface ImageServiceConfig {
  onUnauthorized?: () => void;
}

/** Image Service — uploads scene images to the storage. */
class ImageService {
  private config: ImageServiceConfig;

  constructor(config: ImageServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Uploads an image (multipart; the browser sets the Content-Type boundary). */
  async upload(file: File): Promise<ImageUploadInfo> {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true, false), body });
    return this.handleResponse<ImageUploadInfo>(response);
  }
}

export const imageService = new ImageService();
export default ImageService;
