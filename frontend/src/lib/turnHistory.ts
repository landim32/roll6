import type { TurnHistoryItemInfo } from '../types/turn';

/** Turn console (028): pure rules of the history pages. */

/** Joins two pages without repeating a turn, newest first (a turn arriving twice keeps the latest copy). */
export const mergeTurnPages = (current: TurnHistoryItemInfo[], incoming: TurnHistoryItemInfo[]): TurnHistoryItemInfo[] => {
  const byTurn = new Map<number, TurnHistoryItemInfo>();
  for (const item of current) byTurn.set(item.turnNo, item);
  for (const item of incoming) byTurn.set(item.turnNo, item);
  return [...byTurn.values()].sort((a, b) => b.turnNo - a.turnNo);
};

/** The action lines of a turn without the "## Ações" heading and blank lines. */
export const actionLines = (actions: string): string[] =>
  actions.split('\n').map((line) => line.trimEnd()).filter((line) => line !== '' && !line.startsWith('## '));

/** How many finished turns are newer than the newest one loaded (turn in progress = turnNo). */
export const newTurnsCount = (newestLoaded: number | null, turnNo: number): number =>
  Math.max(0, turnNo - 1 - (newestLoaded ?? 0));
