import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';
import { API_URL, readStoredSession } from './apiHelpers';
import type { WalkSend } from '../types/realtime';

/** Hub path (same origin through the Vite/nginx proxy, like /api). */
const HUB_URL = `${API_URL}/hubs/table`;

/** Client method that receives the table events. */
export const TABLE_EVENT_METHOD = 'tableEvent';

/** Client method that receives the other participants' walk samples (069). */
export const WALK_METHOD = 'walk';

/** Retry delays after a drop; afterwards the context keeps retrying on its own. */
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

/**
 * Realtime Service — SignalR connection to the table hub (017). Every stored change still goes through the REST
 * services; the hub says what changed. The one thing sent here is the transient stream of the own free-mode walk (069).
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

  /** One sample of the own free-mode walk (069): fire and forget, the server relays it to the others or drops it. */
  async sendWalk(connection: HubConnection, info: WalkSend): Promise<void> {
    await connection.send('Walk', info);
  }

  /** Whether this window is on screen and the chat visible (043): decides push vs nothing vs toast on the server. */
  async setPresence(connection: HubConnection, visible: boolean, chatVisible: boolean): Promise<void> {
    await connection.invoke('SetPresence', visible, chatVisible);
  }
}

export const realtimeService = new RealtimeService();
export default RealtimeService;
