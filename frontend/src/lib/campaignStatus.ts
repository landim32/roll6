/**
 * Campaign status (049): Preparando, Ativa, Pausada, Finalizada. Only an active campaign plays — acting, the turn,
 * moving pieces and characters joining are frozen otherwise, and only the master may still build maps while the
 * campaign is being prepared. The conversation chat always works. The server enforces the same rules
 * (`Campaign.EnsurePlayable` / `EnsureMapEditable`); this module only decides what the screen offers.
 */

export const CAMPAIGN_STATUS = { preparing: 1, active: 2, paused: 3, finished: 4 } as const;

export const CAMPAIGN_STATUS_OPTIONS = [
  CAMPAIGN_STATUS.preparing,
  CAMPAIGN_STATUS.active,
  CAMPAIGN_STATUS.paused,
  CAMPAIGN_STATUS.finished,
] as const;

const NAMES: Record<number, string> = {
  [CAMPAIGN_STATUS.preparing]: 'preparing',
  [CAMPAIGN_STATUS.active]: 'active',
  [CAMPAIGN_STATUS.paused]: 'paused',
  [CAMPAIGN_STATUS.finished]: 'finished',
};

/** A campaign read before 049 (no status) plays like an active one. */
const effective = (status: number | null | undefined): number => status ?? CAMPAIGN_STATUS.active;

/** The turn, actions and new characters only move while the campaign is active. */
export const isPlayable = (status: number | null | undefined): boolean => effective(status) === CAMPAIGN_STATUS.active;

/** Pieces, NPC occurrences and maps of the campaign: active, or the master while preparing. */
export const canEditMap = (status: number | null | undefined, isMaster: boolean): boolean => {
  const value = effective(status);
  return value === CAMPAIGN_STATUS.active || (value === CAMPAIGN_STATUS.preparing && isMaster);
};

/** i18n key of the status name ("Preparando", "Ativa", …). */
export const statusLabelKey = (status: number | null | undefined): string =>
  `campaignStatus.label.${NAMES[effective(status)] ?? 'active'}`;

/** i18n key of the notice shown while the campaign does not play ("Campanha pausada"), or null when active. */
export const statusNoticeKey = (status: number | null | undefined): string | null =>
  isPlayable(status) ? null : `campaignStatus.notice.${NAMES[effective(status)] ?? 'paused'}`;
