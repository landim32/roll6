import type {
  CampaignNotificationInfo, PokeResultInfo, PushKeyInfo, PushSubscriptionInfo, UserNotificationPageInfo,
} from '../types/push';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

interface PushServiceConfig {
  onUnauthorized?: () => void;
}

/** Push Service — Web Push notifications (043): key, this device's subscription, mute per campaign and the poke. */
class PushService {
  private config: PushServiceConfig;

  constructor(config: PushServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  async getKey(): Promise<PushKeyInfo> {
    const response = await fetch(`${API_URL}/api/push/key`, { headers: getHeaders(true) });
    return this.handleResponse<PushKeyInfo>(response);
  }

  async subscribe(info: PushSubscriptionInfo): Promise<void> {
    const response = await fetch(`${API_URL}/api/push/subscription`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(info),
    });
    return this.handleResponse<void>(response);
  }

  /** The headers are read now, so this works even when the session is cleared right after the call starts. */
  async unsubscribe(endpoint: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/push/subscription`, {
      method: 'DELETE', headers: getHeaders(true), body: JSON.stringify({ endpoint }), keepalive: true,
    });
    return this.handleResponse<void>(response);
  }

  async listCampaigns(): Promise<CampaignNotificationInfo[]> {
    const response = await fetch(`${API_URL}/api/push/campaigns`, { headers: getHeaders(true) });
    return this.handleResponse<CampaignNotificationInfo[]>(response);
  }

  async setMuted(campaignId: number, muted: boolean): Promise<CampaignNotificationInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/notifications`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ muted }),
    });
    return this.handleResponse<CampaignNotificationInfo>(response);
  }

  /** The bell's inbox: the latest notices received and how many are unread. */
  async inbox(): Promise<UserNotificationPageInfo> {
    const response = await fetch(`${API_URL}/api/push/inbox`, { headers: getHeaders(true) });
    return this.handleResponse<UserNotificationPageInfo>(response);
  }

  /** Marks one notice (id) or all of them (null) as read. */
  async markInboxRead(userNotificationId: number | null): Promise<void> {
    const response = await fetch(`${API_URL}/api/push/inbox/read`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ userNotificationId }),
    });
    return this.handleResponse<void>(response);
  }

  async poke(campaignId: number): Promise<PokeResultInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/poke`, {
      method: 'POST', headers: getHeaders(true), body: '{}',
    });
    return this.handleResponse<PokeResultInfo>(response);
  }
}

export const pushService = new PushService();
export default PushService;
