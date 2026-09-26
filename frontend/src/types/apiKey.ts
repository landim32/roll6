/** API key types (019) — mirror the backend ApiKey DTOs. */

/** Key situation; constants because `enum` is not allowed. */
export const API_KEY_STATUS = {
  active: 'active',
  expired: 'expired',
  revoked: 'revoked',
} as const;

export type ApiKeyStatus = (typeof API_KEY_STATUS)[keyof typeof API_KEY_STATUS];

/** A key as listed to its owner (never the key itself). */
export interface ApiKeyInfo {
  apiKeyId: number;
  name: string;
  /** First characters of the key ("r6_ab12cd34"). */
  keyPrefix: string;
  createdAt: string;
  /** Null = never expires. */
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  status: ApiKeyStatus;
}

/** A new key: the only time the full key is returned. */
export interface ApiKeyCreatedInfo extends ApiKeyInfo {
  key: string;
}

export interface ApiKeyInsertInfo {
  name: string;
  /** UTC ISO date; null = never expires. */
  expiresAt: string | null;
}
