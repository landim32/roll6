import type {
  CampaignPlanDetailInfo, CampaignPlanInfo, CampaignPlanInsertInfo, CampaignPlanUpdateInfo,
} from '../types/campaignPlan';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/campaignplan`;

interface CampaignPlanServiceConfig {
  onUnauthorized?: () => void;
}

/** Campaign Plan Service — the master's plan entries of a campaign (018). */
class CampaignPlanService {
  private config: CampaignPlanServiceConfig;

  constructor(config: CampaignPlanServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Entries of the campaign in creation order (without descriptions). */
  async listByCampaign(campaignId: number): Promise<CampaignPlanInfo[]> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/plan`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignPlanInfo[]>(response);
  }

  /** One entry with its markdown and image URLs. */
  async getById(id: number): Promise<CampaignPlanDetailInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignPlanDetailInfo>(response);
  }

  async create(data: CampaignPlanInsertInfo): Promise<CampaignPlanDetailInfo> {
    const response = await fetch(API_BASE, { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<CampaignPlanDetailInfo>(response);
  }

  async update(id: number, data: CampaignPlanUpdateInfo): Promise<CampaignPlanDetailInfo> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data) });
    return this.handleResponse<CampaignPlanDetailInfo>(response);
  }

  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }
}

export const campaignPlanService = new CampaignPlanService();
export default CampaignPlanService;
