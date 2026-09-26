import type { MapNpcInfo, MapNpcInsertInfo } from '../types/npc';
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
}

export const mapNpcService = new MapNpcService();
export default MapNpcService;
