/** Web Push notifications (043) — mirror of the backend Push DTOs. */
import type { ChatItemInfo } from './chat';

export interface PushKeyInfo {
  /** VAPID public key (base64url); null when the server has no keys (notifications off). */
  publicKey: string | null;
}

export interface PushSubscriptionKeysInfo {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionInfo {
  endpoint: string;
  keys: PushSubscriptionKeysInfo;
  userAgent?: string | null;
}

export interface CampaignNotificationInfo {
  campaignId: number;
  campaignName: string;
  slug: string;
  muted: boolean;
}

/** A personal notice shown as a toast while its campaign is on screen (hub method `notice`). */
export interface NoticeInfo {
  kind: 'majority' | 'turnFinished' | 'life' | 'fatigue' | 'poke';
  campaignId: number;
  title: string;
  body: string;
}

export interface PokeResultInfo {
  poked: number;
  names: string[];
  /** The chat line, when someone was poked. */
  item?: ChatItemInfo | null;
}
