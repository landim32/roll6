import type { ListQuery, PagedList } from '../types/common';
import type { MapModelInfo, MapModelInsertInfo } from '../types/mapModel';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/mapmodel`;

interface MapModelServiceConfig {
  onUnauthorized?: () => void;
}

/** Map Model Service — the shared map library (image, image layout and grid). */
class MapModelService {
  private config: MapModelServiceConfig;

  constructor(config: MapModelServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Lists map models of all users (`mine` = only the logged user's), searching name/description. */
  async list(query: ListQuery): Promise<PagedList<MapModelInfo>> {
    const response = await fetch(`${API_BASE}${toQuery(query)}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<MapModelInfo>>(response);
  }

  /** Gets a map model by id. */
  async getById(id: number): Promise<MapModelInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<MapModelInfo>(response);
  }

  /** Creates a map model owned by the logged user. */
  async create(data: MapModelInsertInfo): Promise<MapModelInfo> {
    const response = await fetch(API_BASE, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<MapModelInfo>(response);
  }

  /** Replaces every field of a map model (only the owner). */
  async update(id: number, data: MapModelInsertInfo): Promise<MapModelInfo> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<MapModelInfo>(response);
  }
}

export const mapModelService = new MapModelService();
export default MapModelService;
