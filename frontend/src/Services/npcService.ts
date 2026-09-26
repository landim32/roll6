import type { ListQuery, PagedList } from '../types/common';
import type { NpcInfo, NpcInsertInfo } from '../types/npc';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/npc`;

interface NpcServiceConfig {
  onUnauthorized?: () => void;
}

/** NPC Service — the logged user's NPC library (owner only). */
class NpcService {
  private config: NpcServiceConfig;

  constructor(config: NpcServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** The user's NPCs, paged and searched by name. */
  async list(query: ListQuery): Promise<PagedList<NpcInfo>> {
    const response = await fetch(`${API_BASE}${toQuery(query)}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<NpcInfo>>(response);
  }

  async getById(id: number): Promise<NpcInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<NpcInfo>(response);
  }

  async create(data: NpcInsertInfo): Promise<NpcInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<NpcInfo>(response);
  }

  async update(id: number, data: NpcInsertInfo): Promise<NpcInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<NpcInfo>(response);
  }
}

export const npcService = new NpcService();
export default NpcService;
