import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { pushService } from '../Services/pushService';
import { useAuth } from '../hooks/useAuth';
import { useInstall } from '../hooks/useInstall';
import { registerBeforeLogout } from '../lib/beforeLogout';
import { PUSH_SUPPORT, pushSupport, subscriptionBody, urlBase64ToUint8Array } from '../lib/push';
import type { PushSupport } from '../lib/push';

interface PushContextType {
  support: PushSupport;
  /** The server has VAPID keys (null while unknown). */
  available: boolean | null;
  /** The browser's permission: 'default' | 'granted' | 'denied'. */
  permission: NotificationPermission | 'unsupported';
  /** This device is subscribed for this user. */
  subscribed: boolean;
  busy: boolean;
  /** Only from a user's tap: asks the permission, subscribes and registers the device (iOS in the browser: the install guide). */
  enable: () => Promise<'enabled' | 'denied' | 'needs-install' | 'unavailable'>;
  disable: () => Promise<void>;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

const currentPermission = (): NotificationPermission | 'unsupported' =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

/** The service worker of the production build (042); none in `npm run dev`. */
const registration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration('/')) ?? null;
};

/**
 * Web Push on this device (043). The permission is only ever asked from `enable()`, called by a tap; logging out
 * removes this device's subscription first (while the session still exists).
 */
export const PushProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { ios, standalone, openGuide } = useInstall();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [permission, setPermission] = useState(currentPermission);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const keyRef = useRef<string | null>(null);
  const endpointRef = useRef<string | null>(null);

  const support = pushSupport({
    hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    hasPushManager: typeof window !== 'undefined' && 'PushManager' in window,
    hasNotification: typeof Notification !== 'undefined',
    ios,
    standalone,
  });

  // On login: is push configured on the server, and is this device already subscribed?
  useEffect(() => {
    if (!session) {
      setAvailable(null);
      setSubscribed(false);
      endpointRef.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const key = await pushService.getKey();
        if (cancelled) return;
        keyRef.current = key.publicKey;
        setAvailable(key.publicKey !== null);
        if (support !== PUSH_SUPPORT.ok) return;
        const reg = await registration();
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        if (cancelled) return;
        endpointRef.current = existing?.endpoint ?? null;
        setSubscribed(existing !== null && Notification.permission === 'granted');
        // Re-register the endpoint for this user (keys may have changed, or another user used this browser).
        const body = existing ? subscriptionBody(existing.toJSON(), navigator.userAgent) : null;
        if (body && Notification.permission === 'granted') await pushService.subscribe(body);
      } catch {
        // Quietly: notifications are optional.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, support]);

  // Logging out on this device: stop its notifications while the token is still there.
  useEffect(() => registerBeforeLogout(() => {
    const endpoint = endpointRef.current;
    if (!endpoint) return;
    void pushService.unsubscribe(endpoint).catch(() => undefined);
    void registration().then((reg) => reg?.pushManager.getSubscription()).then((sub) => sub?.unsubscribe()).catch(() => undefined);
    endpointRef.current = null;
  }), []);

  const enable = useCallback(async () => {
    if (support === PUSH_SUPPORT.needsInstall) {
      openGuide();
      return 'needs-install' as const;
    }
    const key = keyRef.current;
    if (support !== PUSH_SUPPORT.ok || !key) return 'unavailable' as const;
    try {
      setBusy(true);
      // Called from the user's tap: the only moment the permission may be asked.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return 'denied' as const;
      const reg = await registration();
      if (!reg) return 'unavailable' as const;
      const subscription = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) as BufferSource });
      const body = subscriptionBody(subscription.toJSON(), navigator.userAgent);
      if (!body) return 'unavailable' as const;
      await pushService.subscribe(body);
      endpointRef.current = body.endpoint;
      setSubscribed(true);
      return 'enabled' as const;
    } finally {
      setBusy(false);
    }
  }, [support, openGuide]);

  const disable = useCallback(async () => {
    try {
      setBusy(true);
      const reg = await registration();
      const subscription = reg ? await reg.pushManager.getSubscription() : null;
      if (subscription) {
        await pushService.unsubscribe(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe();
      }
      endpointRef.current = null;
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<PushContextType>(() => ({
    support, available, permission, subscribed, busy, enable, disable,
  }), [support, available, permission, subscribed, busy, enable, disable]);

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
};

export default PushContext;
