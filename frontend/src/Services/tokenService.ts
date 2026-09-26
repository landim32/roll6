import type { ListQuery, PagedList } from '../types/common';
import type { TokenInfo, TokenInsertInfo } from '../types/token';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/token`;

interface TokenServiceConfig {
  onUnauthorized?: () => void;
}

/** Token Service — the token library (every user's tokens). */
class TokenService {
  private config: TokenServiceConfig;

  constructor(config: TokenServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Paged library, searching by name; `mine` lists only the logged user's tokens. */
  async list(query: ListQuery): Promise<PagedList<TokenInfo>> {
    const response = await fetch(`${API_BASE}${toQuery(query)}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<TokenInfo>>(response);
  }

  async create(data: TokenInsertInfo): Promise<TokenInfo> {
    const response = await fetch(API_BASE, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<TokenInfo>(response);
  }

  /** Changes a token (its creator only). */
  async update(id: number, data: TokenInsertInfo): Promise<TokenInfo> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<TokenInfo>(response);
  }
}

export const tokenService = new TokenService();
export default TokenService;
