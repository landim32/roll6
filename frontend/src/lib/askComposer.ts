import type { AskStatusInfo } from '../types/chat';

/** Longest question (backend Turn.MAX_QUESTION, 093). */
export const MAX_QUESTION = 1000;
/** Longest answer (backend Turn.MAX_ANSWER, 093). */
export const MAX_ANSWER = 4000;

/** What typed at the start of the field turns it into a question (093). */
export const ASK_PREFIX = '/perguntar';

/**
 * "/perguntar " at the very start of the field (any case) asks for the question mode and leaves only the question; the
 * word anywhere else, or without the space after it, is plain text.
 */
export const parseAskPrefix = (text: string): { ask: boolean; text: string } => {
  const head = text.slice(0, ASK_PREFIX.length + 1);
  if (head.toLowerCase() === `${ASK_PREFIX} ` || head.toLowerCase() === `${ASK_PREFIX}\n`) {
    return { ask: true, text: text.slice(ASK_PREFIX.length + 1) };
  }
  return { ask: false, text };
};

/** Whether the viewer can ask now: the master's console offline, their own question waiting, or ready. */
export type AskAvailability = 'ready' | 'offline' | 'waiting';

export const askAvailability = (status: AskStatusInfo): AskAvailability => {
  if (!status.available) return 'offline';
  if (status.waitingTurnId !== null) return 'waiting';
  return 'ready';
};
