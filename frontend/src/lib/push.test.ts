import { describe, expect, it } from 'vitest';
import { PUSH_SUPPORT, SIMULATE_KINDS, deviceResultKey, pushSupport, resultKey, subscriptionBody, testSummaryKey, urlBase64ToUint8Array } from './push';

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

describe('testing notifications (074)', () => {
  it('names each device answer', () => {
    expect(resultKey('sent')).toBe('notifications.test.sent');
    expect(resultKey('gone')).toBe('notifications.test.gone');
    expect(resultKey('failed')).toBe('notifications.test.failed');
    expect(resultKey('other')).toBe('notifications.test.failed');
    expect(deviceResultKey('sent')).toBe('notifications.devices.result.sent');
    expect(deviceResultKey('gone')).toBe('notifications.devices.result.gone');
    expect(deviceResultKey('failed')).toBe('notifications.devices.result.failed');
  });

  it('sums up a test over several devices', () => {
    expect(testSummaryKey([])).toBe('notifications.test.noDevice');
    expect(testSummaryKey([{ result: 'sent' }, { result: 'sent' }])).toBe('notifications.test.allSent');
    expect(testSummaryKey([{ result: 'sent' }, { result: 'failed' }])).toBe('notifications.test.someFailed');
    expect(testSummaryKey([{ result: 'gone' }])).toBe('notifications.test.noneSent');
  });

  it('offers the nine kinds the server simulates, in order', () => {
    expect(SIMULATE_KINDS).toEqual(['message', 'action', 'pending', 'pendingLast', 'turnFinished', 'life', 'fatigue', 'poke', 'pokeMaster']);
  });
});
