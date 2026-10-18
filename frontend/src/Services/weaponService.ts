import type { ListQuery, PagedList } from '../types/common';
import type { WeaponInfo, WeaponInsertInfo, WeaponUpdateInfo } from '../types/weapon';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/weapon`;

interface WeaponServiceConfig {
  onUnauthorized?: () => void;
}

/** Weapon Service (082) — the shared weapon library. The `.glb` itself goes through `modelService.upload`. */
class WeaponService {
  private config: WeaponServiceConfig;

  constructor(config: WeaponServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Paged library, searching by name; `mine` lists only the logged user's (own first otherwise). */
  async list(query: ListQuery): Promise<PagedList<WeaponInfo>> {
    const response = await fetch(`${API_BASE}${toQuery(query)}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<WeaponInfo>>(response);
  }

  async get(id: number): Promise<WeaponInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<WeaponInfo>(response);
  }

  async create(data: WeaponInsertInfo): Promise<WeaponInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<WeaponInfo>(response);
  }

  /** Renames, points the weapon to a new file and/or sets its grip point and pose (083; owner only). */
  async update(id: number, data: WeaponUpdateInfo): Promise<WeaponInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<WeaponInfo>(response);
  }

  /** Deletes (owner only; 409 while any token holds it). */
  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const weaponService = new WeaponService();
export default WeaponService;
