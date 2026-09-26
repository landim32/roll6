/** API key form rules (019): expiration choices and validation, same limits as the backend ApiKey. */

export const API_KEY_MAX_NAME = 100;

/** Expiration choices; constants because `enum` is not allowed. */
export const API_KEY_EXPIRATION = {
  d7: 'd7',
  d30: 'd30',
  d90: 'd90',
  d365: 'd365',
  date: 'date',
  never: 'never',
} as const;

export type ApiKeyExpiration = (typeof API_KEY_EXPIRATION)[keyof typeof API_KEY_EXPIRATION];

const PRESET_DAYS: Partial<Record<ApiKeyExpiration, number>> = { d7: 7, d30: 30, d90: 90, d365: 365 };

/** Brasília is UTC−3 all year (no daylight saving since 2019). */
const BRASILIA_OFFSET_HOURS = -3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ApiKeyForm {
  name: string;
  choice: ApiKeyExpiration;
  /** `YYYY-MM-DD` from the date input (only for `date`). */
  dateText: string;
}

/** End of the chosen day (23:59:59.999) in Brasília, as a UTC instant; null for an invalid text. */
const endOfDayInBrasilia = (dateText: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  // 23:59:59.999 local = that instant minus the (negative) offset in UTC.
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - BRASILIA_OFFSET_HOURS * 60 * 60 * 1000);
};

/** When the key expires, or null for "never" (presets count from now). */
export const expirationToDate = (choice: ApiKeyExpiration, dateText: string, now: Date): Date | null => {
  if (choice === API_KEY_EXPIRATION.never) return null;
  if (choice === API_KEY_EXPIRATION.date) return endOfDayInBrasilia(dateText);
  return new Date(now.getTime() + (PRESET_DAYS[choice] ?? 30) * DAY_MS);
};

/** i18n key of the first problem, or null when the key can be generated. */
export const validateApiKeyForm = ({ name, choice, dateText }: ApiKeyForm, now: Date): string | null => {
  if (!name.trim()) return 'apiKeys.nameRequired';
  if (name.trim().length > API_KEY_MAX_NAME) return 'apiKeys.nameTooLong';
  if (choice === API_KEY_EXPIRATION.date) {
    const end = endOfDayInBrasilia(dateText);
    if (!end) return 'apiKeys.dateRequired';
    if (end.getTime() <= now.getTime()) return 'apiKeys.datePast';
  }
  return null;
};

/** Tomorrow in Brasília as `YYYY-MM-DD` (minimum of the date input). */
export const tomorrowInBrasilia = (now: Date): string =>
  new Date(now.getTime() + BRASILIA_OFFSET_HOURS * 60 * 60 * 1000 + DAY_MS).toISOString().slice(0, 10);

/** Backend dates are UTC without the zone marker; read them as UTC. */
export const parseUtc = (value: string): Date => new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
