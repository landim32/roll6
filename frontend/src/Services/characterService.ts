import type { CharacterInfo, CharacterInsertInfo, CharacterSearchInfo } from '../types/character';
import type { ListQuery, PagedList } from '../types/common';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/character`;

interface CharacterServiceConfig {
  onUnauthorized?: () => void;
}

/** Character Service — the logged user's characters and the public search. */
class CharacterService {
  private config: CharacterServiceConfig;

  constructor(config: CharacterServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Characters of the logged user. */
  async listMine(): Promise<CharacterInfo[]> {
    const response = await fetch(API_BASE, { headers: getHeaders(true) });
    return this.handleResponse<CharacterInfo[]>(response);
  }

  /** Creates a character owned by the logged user. */
  async create(data: CharacterInsertInfo): Promise<CharacterInfo> {
    const response = await fetch(API_BASE, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<CharacterInfo>(response);
  }

  /** Gets a character (its owner or the master of a campaign where it is approved). */
  async getById(id: number): Promise<CharacterInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<CharacterInfo>(response);
  }

  /** Updates a character (owner or master of a campaign where it is approved). */
  async update(id: number, data: CharacterInsertInfo): Promise<CharacterInfo> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<CharacterInfo>(response);
  }

  /** Searches characters of every user by name (public fields only), paged. */
  async search(query: ListQuery): Promise<PagedList<CharacterSearchInfo>> {
    const response = await fetch(`${API_BASE}/search${toQuery(query)}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<CharacterSearchInfo>>(response);
  }
}

export const characterService = new CharacterService();
export default CharacterService;
