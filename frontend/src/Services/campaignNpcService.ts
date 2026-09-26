import type { CampaignNpcInfo, CampaignNpcInsertInfo } from '../types/npc';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/campaignnpc`;

interface CampaignNpcServiceConfig {
  onUnauthorized?: () => void;
}

/** Campaign NPC Service — NPCs available in a campaign (master only). */
class CampaignNpcService {
  private config: CampaignNpcServiceConfig;

  constructor(config: CampaignNpcServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  async listByCampaign(campaignId: number): Promise<CampaignNpcInfo[]> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/npc`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignNpcInfo[]>(response);
  }

  /** Adds one of the master's NPCs to the campaign. */
  async add(data: CampaignNpcInsertInfo): Promise<CampaignNpcInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<CampaignNpcInfo>(response);
  }

  /** Removes the NPC from the campaign and its pieces from the campaign's maps. */
  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const campaignNpcService = new CampaignNpcService();
export default CampaignNpcService;
