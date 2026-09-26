import type {
  MapTokenCharacterInsertInfo, MapTokenInfo, MapTokenInsertInfo, MapTokenPositionInfo, MapTokenTokenInfo,
} from '../types/mapToken';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/maptoken`;

interface MapTokenServiceConfig {
  onUnauthorized?: () => void;
}

/** Map Token Service — pieces on a campaign map (reads: master + approved participants; writes: master). */
class MapTokenService {
  private config: MapTokenServiceConfig;

  constructor(config: MapTokenServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  private async send(method: string, path: string, body: unknown): Promise<MapTokenInfo> {
    const response = await fetch(`${API_BASE}${path}`, {
      method, headers: getHeaders(true), body: JSON.stringify(body),
    });
    return this.handleResponse<MapTokenInfo>(response);
  }

  async listByMap(mapId: number): Promise<MapTokenInfo[]> {
    const response = await fetch(`${API_URL}/api/map/${mapId}/token`, { headers: getHeaders(true) });
    return this.handleResponse<MapTokenInfo[]>(response);
  }

  /** New NPC/enemy/object piece. */
  async create(data: MapTokenInsertInfo): Promise<MapTokenInfo> {
    return this.send('POST', '', data);
  }

  /** Places a campaign character (saves the token on it when it had none). */
  async placeCharacter(data: MapTokenCharacterInsertInfo): Promise<MapTokenInfo> {
    return this.send('POST', '/character', data);
  }

  async move(id: number, data: MapTokenPositionInfo): Promise<MapTokenInfo> {
    return this.send('PUT', `/${id}/position`, data);
  }

  async changeToken(id: number, data: MapTokenTokenInfo): Promise<MapTokenInfo> {
    return this.send('PUT', `/${id}/token`, data);
  }

  /** Removes the piece from the map (the library token is kept). */
  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const mapTokenService = new MapTokenService();
export default MapTokenService;
