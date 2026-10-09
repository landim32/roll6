import { describe, expect, it } from 'vitest';
import { PUSH_SUPPORT, pushSupport, subscriptionBody, urlBase64ToUint8Array } from './push';

const env = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, ios: false, standalone: false };

describe('push support', () => {
  it('works where the APIs exist', () => {
    expect(pushSupport(env)).toBe(PUSH_SUPPORT.ok);
    expect(pushSupport({ ...env, hasPushManager: false })).toBe(PUSH_SUPPORT.unsupported);
  });

  it('asks iPhone users to install first', () => {
    expect(pushSupport({ ...env, ios: true, hasPushManager: false })).toBe(PUSH_SUPPORT.needsInstall);
    expect(pushSupport({ ...env, ios: true, standalone: true })).toBe(PUSH_SUPPORT.ok);
  });
});

describe('key and body', () => {
  it('decodes a base64url key', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID_-8'))).toEqual([1, 2, 3, 255, 239]);
  });

  it('builds the subscription body', () => {
    expect(subscriptionBody({ endpoint: 'https://x/y', keys: { p256dh: 'p', auth: 'a' } }, 'UA')).toEqual({
      endpoint: 'https://x/y', keys: { p256dh: 'p', auth: 'a' }, userAgent: 'UA',
    });
    expect(subscriptionBody({ endpoint: 'https://x/y', keys: {} }, 'UA')).toBeNull();
  });
});
