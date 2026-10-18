import type { PagedList } from '../types/common';
import type { AnimationFile } from '../lib/animationFormat';
import type { AnimationInfo, AnimationInsertInfo, AnimationQuery, AnimationUpdateInfo } from '../types/animation';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/animation`;

interface AnimationServiceConfig {
  onUnauthorized?: () => void;
}

/** Animation Service (059) — the shared animation library and its files. */
class AnimationService {
  private config: AnimationServiceConfig;

  constructor(config: AnimationServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Paged library, searching by name; `mine` lists only the logged user's, `type` one type (own first otherwise). */
  async list(query: AnimationQuery): Promise<PagedList<AnimationInfo>> {
    const base = toQuery(query);
    const type = query.type ? `${base ? '&' : '?'}type=${query.type}` : '';
    const response = await fetch(`${API_BASE}${base}${type}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<AnimationInfo>>(response);
  }

  async get(id: number): Promise<AnimationInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<AnimationInfo>(response);
  }

  /** The text of the animation's file, read through the API. */
  async getContent(id: number): Promise<string> {
    const response = await fetch(`${API_BASE}/${id}/file`, { headers: getHeaders(true, false) });
    if (!response.ok) return this.handleResponse<string>(response);
    return response.text();
  }

  async create(data: AnimationInsertInfo): Promise<AnimationInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<AnimationInfo>(response);
  }

  /** Renames or retypes (owner only; 409 while a token uses it in the state of its old type). */
  async update(id: number, data: AnimationUpdateInfo): Promise<AnimationInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<AnimationInfo>(response);
  }

  /** Replaces the content of an animation (owner only; the server validates it and tells the editors, 086). */
  async replaceContent(id: number, content: AnimationFile, thumbnailImage?: string): Promise<AnimationInfo> {
    const response = await fetch(`${API_BASE}/${id}/content`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ content, thumbnailImage }) });
    return this.handleResponse<AnimationInfo>(response);
  }

  /** Deletes (owner only; 409 while any token uses it). */
  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const animationService = new AnimationService();
export default AnimationService;
