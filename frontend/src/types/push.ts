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

/** A notice in the bell (inbox): exactly what the Web Push carried. */
export interface UserNotificationInfo {
  userNotificationId: number;
  campaignId: number | null;
  kind: string;
  title: string;
  body: string;
  url: string | null;
  /** UTC without a zone. */
  createdAt: string;
  read: boolean;
}

export interface UserNotificationPageInfo {
  items: UserNotificationInfo[];
  unreadCount: number;
}

export interface PokeResultInfo {
  poked: number;
  /** 074: nobody else was missing, so the master was poked. */
  master?: boolean;
  names: string[];
  /** The chat line, when someone was poked. */
  item?: ChatItemInfo | null;
}

/** A device of the user that receives notifications (074). */
export interface PushDeviceInfo {
  pushSubscriptionId: number;
  /** "Chrome · Android". */
  label: string;
  endpoint: string;
  /** UTC without a zone. */
  createdAt: string;
  lastSuccessAt: string | null;
  failureCount: number;
  /** Too many failures in a row: no pushes until a test succeeds. */
  skipped: boolean;
}

export type PushTestResult = 'sent' | 'gone' | 'failed';

export interface PushTestDeviceInfo {
  pushSubscriptionId: number;
  label: string;
  result: PushTestResult;
}

export interface PushTestResultInfo {
  devices: PushTestDeviceInfo[];
}

export interface TurnNoticePendingInfo {
  userId: number;
  name: string;
  characters: string[];
  /** What "Falta…" would say now; null before the majority. */
  body: string | null;
}

/** The master's preview of "Falta…" (074). */
export interface TurnNoticePreviewInfo {
  turnNo: number;
  approved: number;
  acted: number;
  threshold: number;
  majorityReached: boolean;
  pending: TurnNoticePendingInfo[];
}
