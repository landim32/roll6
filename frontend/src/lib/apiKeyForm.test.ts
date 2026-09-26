import { describe, expect, it } from 'vitest';
import { API_KEY_EXPIRATION, expirationToDate, parseUtc, tomorrowInBrasilia, validateApiKeyForm } from './apiKeyForm';

const NOW = new Date('2026-09-26T15:00:00Z'); // 12:00 in Brasília

describe('expirationToDate', () => {
  it('counts presets from now', () => {
    expect(expirationToDate(API_KEY_EXPIRATION.d7, '', NOW)?.toISOString()).toBe('2026-10-03T15:00:00.000Z');
    expect(expirationToDate(API_KEY_EXPIRATION.d365, '', NOW)?.toISOString()).toBe('2027-09-26T15:00:00.000Z');
  });

  it('returns null for "never"', () => {
    expect(expirationToDate(API_KEY_EXPIRATION.never, '', NOW)).toBeNull();
  });

  it('ends a chosen day at 23:59:59.999 in Brasília (02:59:59.999 UTC next day)', () => {
    expect(expirationToDate(API_KEY_EXPIRATION.date, '2026-10-31', NOW)?.toISOString()).toBe('2026-11-01T02:59:59.999Z');
    expect(expirationToDate(API_KEY_EXPIRATION.date, 'garbage', NOW)).toBeNull();
  });
});

describe('validateApiKeyForm', () => {
  const ok = { name: 'Bot', choice: API_KEY_EXPIRATION.d30, dateText: '' };

  it('requires a name within the limit', () => {
    expect(validateApiKeyForm({ ...ok, name: '  ' }, NOW)).toBe('apiKeys.nameRequired');
    expect(validateApiKeyForm({ ...ok, name: 'a'.repeat(101) }, NOW)).toBe('apiKeys.nameTooLong');
    expect(validateApiKeyForm(ok, NOW)).toBeNull();
  });

  it('requires a future date for a specific date', () => {
    const date = { ...ok, choice: API_KEY_EXPIRATION.date };
    expect(validateApiKeyForm({ ...date, dateText: '' }, NOW)).toBe('apiKeys.dateRequired');
    expect(validateApiKeyForm({ ...date, dateText: '2026-09-25' }, NOW)).toBe('apiKeys.datePast');
    // Today still has hours left in Brasília.
    expect(validateApiKeyForm({ ...date, dateText: '2026-09-26' }, NOW)).toBeNull();
  });
});

describe('dates', () => {
  it('tomorrow is based on the Brasília day', () => {
    expect(tomorrowInBrasilia(NOW)).toBe('2026-09-27');
    // 01:00 UTC is still the previous day (22:00) in Brasília.
    expect(tomorrowInBrasilia(new Date('2026-09-27T01:00:00Z'))).toBe('2026-09-27');
  });

  it('reads backend dates as UTC', () => {
    expect(parseUtc('2026-09-26T12:00:00').toISOString()).toBe('2026-09-26T12:00:00.000Z');
    expect(parseUtc('2026-09-26T12:00:00Z').toISOString()).toBe('2026-09-26T12:00:00.000Z');
  });
});
