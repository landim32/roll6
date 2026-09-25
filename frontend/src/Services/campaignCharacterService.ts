import type { CampaignCharacterInfo, CampaignCharacterRequestInfo, CampaignCharacterVitalsInfo } from '../types/campaignCharacter';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/campaigncharacter`;

interface CampaignCharacterServiceConfig {
  onUnauthorized?: () => void;
}

/** Campaign Character Service — requests, invites, approvals and removal of characters in campaigns. */
class CampaignCharacterService {
  private config: CampaignCharacterServiceConfig;

  constructor(config: CampaignCharacterServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  private async post(path: string, body?: unknown): Promise<CampaignCharacterInfo> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST', headers: getHeaders(true), body: body === undefined ? undefined : JSON.stringify(body),
    });
    return this.handleResponse<CampaignCharacterInfo>(response);
  }

  /** Participations (any status) of the logged user's characters in the campaign. */
  async listMine(campaignId: number): Promise<CampaignCharacterInfo[]> {
    const response = await fetch(`${API_BASE}/mine?campaignId=${campaignId}`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignCharacterInfo[]>(response);
  }

  /** All characters of the campaign (master) or the approved ones (approved participants). */
  async listByCampaign(campaignId: number): Promise<CampaignCharacterInfo[]> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/character`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignCharacterInfo[]>(response);
  }

  /** Pending invites of the logged user's characters. */
  async listInvites(): Promise<CampaignCharacterInfo[]> {
    const response = await fetch(`${API_BASE}/invites`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignCharacterInfo[]>(response);
  }

  /** Character owner asks to join (approved directly in open campaigns or for the master). */
  async requestAccess(data: CampaignCharacterRequestInfo): Promise<CampaignCharacterInfo> {
    return this.post('/request', data);
  }

  /** Master invites a character. */
  async invite(data: CampaignCharacterRequestInfo): Promise<CampaignCharacterInfo> {
    return this.post('/invite', data);
  }

  async accept(id: number): Promise<CampaignCharacterInfo> {
    return this.post(`/${id}/accept`);
  }

  async decline(id: number): Promise<CampaignCharacterInfo> {
    return this.post(`/${id}/decline`);
  }

  async approve(id: number): Promise<CampaignCharacterInfo> {
    return this.post(`/${id}/approve`);
  }

  async deny(id: number): Promise<CampaignCharacterInfo> {
    return this.post(`/${id}/deny`);
  }

  /** Current life/energy in the campaign (character owner or campaign master). */
  async updateVitals(id: number, data: CampaignCharacterVitalsInfo): Promise<CampaignCharacterInfo> {
    const response = await fetch(`${API_BASE}/${id}/vitals`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<CampaignCharacterInfo>(response);
  }

  /** Master removes the character from the campaign (the character itself is kept). */
  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const campaignCharacterService = new CampaignCharacterService();
export default CampaignCharacterService;
