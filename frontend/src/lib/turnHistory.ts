import type { TurnHistoryItemInfo } from '../types/turn';

/** Turn console (028): pure rules of the history pages. */

/**
 * Joins two pages without repeating a narration, newest first (one arriving twice keeps the latest copy). The key is
 * the entry id, not the turn: a turn holds several narrations, so deduplicating by turn would silently hide all but
 * one of them — the very defect this list is meant to stop having.
 */
export const mergeTurnPages = (current: TurnHistoryItemInfo[], incoming: TurnHistoryItemInfo[]): TurnHistoryItemInfo[] => {
  const byEntry = new Map<number, TurnHistoryItemInfo>();
  for (const item of current) byEntry.set(item.turnId, item);
  for (const item of incoming) byEntry.set(item.turnId, item);
  return [...byEntry.values()].sort((a, b) => b.turnNo - a.turnNo);
};

/**
 * The turn log is one entry per line. A markdown renderer folds a single newline into a space, so each line
 * becomes a hard break (two trailing spaces) and a blank line stays a paragraph break.
 */
export const turnLogMarkdown = (actions: string): string =>
  actions.replace(/\r\n/g, '\n').replace(/([^\n])\n(?!\n)/g, '$1  \n');

/**
 * How many turns to read from `turnNo` downwards to bring the console up to date: the turns newer than the newest one
 * loaded, plus that newest one — the list holds the turn in progress too, and the turn that just closed may have
 * gained its final narration after it was read. Null (nothing loaded yet) counts from turn 1.
 */
export const newTurnsCount = (newestLoaded: number | null, turnNo: number): number =>
  Math.max(0, turnNo - (newestLoaded ?? 0) + 1);
