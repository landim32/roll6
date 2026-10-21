import type { TurnRepeatResultInfo } from '../types/turn';

/** Longest repeated action (backend Turn.MAX_DESCRIPTION, like an action). */
export const MAX_REPEATED = 2000;

/** The active repeated action of a piece's actor (099), or null — blank texts count as none. */
export const repeatedActionOf = (piece: { repeatedAction?: string | null } | null | undefined): string | null => {
  const text = piece?.repeatedAction?.trim();
  return text ? text : null;
};

/** The toast after saving or removing (099): "ativada", "ativada e já registrada neste turno" or "removida". */
export const resultToastKey = (result: TurnRepeatResultInfo): string => {
  if (!result.active) return 'repeated.removed';
  return result.applied ? 'repeated.savedNow' : 'repeated.saved';
};
