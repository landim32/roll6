/**
 * Pure rules of the Web Push notifications (043): whether this browser can receive them, the VAPID key conversion the
 * Push API needs and the body the backend takes. Browser values are passed in so every rule is testable.
 */

export const PUSH_SUPPORT = {
  /** No service worker / Push API / Notification API here. */
  unsupported: 'unsupported',
  /** iPhone/iPad in the browser: push only works with the Roll6 installed on the home screen. */
  needsInstall: 'needs-install',
  ok: 'ok',
} as const;

export type PushSupport = (typeof PUSH_SUPPORT)[keyof typeof PUSH_SUPPORT];

export interface PushEnvironment {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  ios: boolean;
  standalone: boolean;
}

export const pushSupport = (env: PushEnvironment): PushSupport => {
  // On iOS the Push API only exists inside the installed app.
  if (env.ios && !env.standalone) return PUSH_SUPPORT.needsInstall;
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return PUSH_SUPPORT.unsupported;
  return PUSH_SUPPORT.ok;
};

/** The VAPID public key (base64url) as the bytes `pushManager.subscribe` wants. */
export const urlBase64ToUint8Array = (base64Url: string): Uint8Array => {
  const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

export interface SubscriptionJson {
  endpoint?: string;
  keys?: Record<string, string>;
}

/** The body of `POST /api/push/subscription` from `PushSubscription.toJSON()`; null when something is missing. */
export const subscriptionBody = (json: SubscriptionJson, userAgent: string) => {
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh, auth }, userAgent: userAgent.slice(0, 500) };
};

/** The kinds the master can simulate (074), in the order of the select. */
export const SIMULATE_KINDS = [
  'message', 'action', 'pending', 'pendingLast', 'turnFinished', 'life', 'fatigue', 'poke', 'pokeMaster',
] as const;

export type SimulateKind = (typeof SIMULATE_KINDS)[number];

/** i18n key of a device's answer to a test (074). */
export const resultKey = (result: string): string => {
  if (result === 'sent') return 'notifications.test.sent';
  if (result === 'gone') return 'notifications.test.gone';
  return 'notifications.test.failed';
};

/** i18n key of the short badge a device gets in the list after "Testar todos" (074). */
export const deviceResultKey = (result: string): string => {
  if (result === 'sent') return 'notifications.devices.result.sent';
  if (result === 'gone') return 'notifications.devices.result.gone';
  return 'notifications.devices.result.failed';
};

/** The summary of a test over several devices: every device sent, some failed, or none registered. */
export const testSummaryKey = (results: { result: string }[]): string => {
  if (results.length === 0) return 'notifications.test.noDevice';
  if (results.every((r) => r.result === 'sent')) return 'notifications.test.allSent';
  if (results.some((r) => r.result === 'sent')) return 'notifications.test.someFailed';
  return 'notifications.test.noneSent';
};
