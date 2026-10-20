/**
 * The GM mode (096) as the table shows it: a campaign flag the master switches, a run state the chat's status carries
 * (`AskStatusInfo.gmRunningTurn`) and, for the master, whether his console is there to work.
 */

export const GM_BADGE = { off: 'off', on: 'on', noConsole: 'noConsole', running: 'running' } as const;
export type GmBadge = (typeof GM_BADGE)[keyof typeof GM_BADGE];

interface GmStatus {
  available: boolean;
  gmRunningTurn: number | null;
}

/**
 * What the footer says: nothing while the mode is off; "running" wins while a run is queued or running; "no console"
 * only for the master (the status is his console's; a player cannot do anything about it); else the mode is on.
 */
export const gmBadge = (campaign: { gmMode?: boolean } | null | undefined, status: GmStatus | null | undefined, isMaster: boolean): GmBadge => {
  if (!campaign?.gmMode) return GM_BADGE.off;
  if (status?.gmRunningTurn != null) return GM_BADGE.running;
  if (isMaster && status && !status.available) return GM_BADGE.noConsole;
  return GM_BADGE.on;
};
