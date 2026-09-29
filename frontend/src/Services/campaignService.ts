import type { CampaignInfo, CampaignInsertInfo, CampaignTableInfo } from '../types/campaign';
import type { ListQuery, PagedList } from '../types/common';
import { API_URL, getHeaders, handleApiResponse, toQuery } from './apiHelpers';

const API_BASE = `${API_URL}/api/campaign`;

interface CampaignServiceConfig {
  onUnauthorized?: () => void;
}

/** Campaign Service — campaign list, lookup and creation. */
class CampaignService {
  private config: CampaignServiceConfig;

  constructor(config: CampaignServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Lists campaigns of all users (`mine` = only the logged user's), paged, with optional name search. */
  async list(query: ListQuery): Promise<PagedList<CampaignInfo>> {
    const response = await fetch(`${API_BASE}${toQuery(query)}`, { headers: getHeaders(true) });
    return this.handleResponse<PagedList<CampaignInfo>>(response);
  }

  /** Gets a campaign by id. */
  async getById(id: number): Promise<CampaignInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignInfo>(response);
  }

  /** Campaigns the user masters or plays, with the active map the table follows. */
  async listTable(): Promise<CampaignTableInfo[]> {
    const response = await fetch(`${API_BASE}/table`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignTableInfo[]>(response);
  }

  /** Gets a campaign by its URL slug. */
  async getBySlug(slug: string): Promise<CampaignInfo> {
    const response = await fetch(`${API_BASE}/slug/${encodeURIComponent(slug)}`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignInfo>(response);
  }

  /** Master: sets the map the players follow (017); null clears it. */
  async setCurrentMap(id: number, mapId: number | null): Promise<CampaignInfo> {
    const response = await fetch(`${API_BASE}/${id}/current-map`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ mapId }),
    });
    return this.handleResponse<CampaignInfo>(response);
  }

  /** Creates a campaign owned by the logged user. */
  async create(data: CampaignInsertInfo): Promise<CampaignInfo> {
    const response = await fetch(API_BASE, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<CampaignInfo>(response);
  }
}

export const campaignService = new CampaignService();
export default CampaignService;
