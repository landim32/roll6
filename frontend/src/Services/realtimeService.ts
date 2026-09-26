import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';
import { API_URL, readStoredSession } from './apiHelpers';

/** Hub path (same origin through the Vite/nginx proxy, like /api). */
const HUB_URL = `${API_URL}/hubs/table`;

/** Client method that receives the table events. */
export const TABLE_EVENT_METHOD = 'tableEvent';

/** Retry delays after a drop; afterwards the context keeps retrying on its own. */
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

/**
 * Realtime Service — SignalR connection to the table hub (017). Server → client only: every change still goes
 * through the REST services; the hub just says what changed.
 */
class RealtimeService {
  /** New connection authenticated with the stored session token. */
  createConnection(): HubConnection {
    return new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => readStoredSession()?.token ?? '' })
      .withAutomaticReconnect(RECONNECT_DELAYS)
      .configureLogging(LogLevel.Warning)
      .build();
  }

  /** Follows a campaign (master or approved participant; the hub refuses anyone else). */
  async joinCampaign(connection: HubConnection, campaignId: number): Promise<void> {
    await connection.invoke('JoinCampaign', campaignId);
  }

  async leaveCampaign(connection: HubConnection): Promise<void> {
    await connection.invoke('LeaveCampaign');
  }
}

export const realtimeService = new RealtimeService();
export default RealtimeService;
