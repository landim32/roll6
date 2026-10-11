import type { MapNpcInfo, MapNpcInsertInfo, MapNpcUpdateInfo } from '../types/npc';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/mapnpc`;

interface MapNpcServiceConfig {
  onUnauthorized?: () => void;
}

/** Map NPC Service — NPC occurrences on campaign maps (writes: master). */
class MapNpcService {
  private config: MapNpcServiceConfig;

  constructor(config: MapNpcServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Creates an occurrence of a campaign NPC and its piece on a free hex. */
  async create(data: MapNpcInsertInfo): Promise<MapNpcInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<MapNpcInfo>(response);
  }

  /** Changes one instance (051): name, current life/energy, Deslocamento, status, posture. */
  async update(mapNpcId: number, data: MapNpcUpdateInfo): Promise<MapNpcInfo> {
    const response = await fetch(`${API_BASE}/${mapNpcId}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<MapNpcInfo>(response);
  }

  /** Takes the instance off the map (051); the NPC stays in the campaign and the history stays in the chat. */
  async remove(mapNpcId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${mapNpcId}`, { method: 'DELETE', headers: getHeaders(true) });
    await this.handleResponse<void>(response);
  }
}

export const mapNpcService = new MapNpcService();
export default MapNpcService;
