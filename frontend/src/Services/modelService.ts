import type { ModelUploadInfo } from '../types/token';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/model`;

interface ModelServiceConfig {
  onUnauthorized?: () => void;
}

/** Model Service (055) — stores a token's 3D model (.glb) and reads stored ones back through the API. */
class ModelService {
  private config: ModelServiceConfig;

  constructor(config: ModelServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Uploads the file exactly as chosen (multipart). */
  async upload(file: File): Promise<ModelUploadInfo> {
    const typed = file.type ? file : new File([file], file.name, { type: 'model/gltf-binary' });
    const body = new FormData();
    body.append('file', typed);
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true, false), body });
    return this.handleResponse<ModelUploadInfo>(response);
  }

  /**
   * Bytes of a stored model read through the API: the bucket's presigned URLs send no CORS headers, so `fetch` can't
   * read them. Null when the API cannot serve it.
   */
  async fetchStored(fileName: string): Promise<ArrayBuffer | null> {
    const response = await fetch(`${API_BASE}/file/${encodeURIComponent(fileName)}`, {
      headers: { ...getHeaders(true, false), Accept: 'model/gltf-binary' },
    });
    return response.ok ? response.arrayBuffer() : null;
  }
}

export const modelService = new ModelService();
export default ModelService;
