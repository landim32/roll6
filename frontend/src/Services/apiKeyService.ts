import type { ApiKeyCreatedInfo, ApiKeyInfo, ApiKeyInsertInfo } from '../types/apiKey';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/apikey`;

interface ApiKeyServiceConfig {
  onUnauthorized?: () => void;
}

/** API Key Service — the logged user's API keys (019); needs the login session. */
class ApiKeyService {
  private config: ApiKeyServiceConfig;

  constructor(config: ApiKeyServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** The user's keys, newest first. */
  async list(): Promise<ApiKeyInfo[]> {
    const response = await fetch(API_BASE, { headers: getHeaders(true) });
    return this.handleResponse<ApiKeyInfo[]>(response);
  }

  /** Creates a key; the response carries the full key (shown once). */
  async create(data: ApiKeyInsertInfo): Promise<ApiKeyCreatedInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<ApiKeyCreatedInfo>(response);
  }

  /** Stops the key for good. */
  async revoke(id: number): Promise<ApiKeyInfo> {
    const response = await fetch(`${API_BASE}/${id}/revoke`, { method: 'POST', headers: getHeaders(true) });
    return this.handleResponse<ApiKeyInfo>(response);
  }

  /** Deletes a revoked or expired key. */
  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const apiKeyService = new ApiKeyService();
export default ApiKeyService;
