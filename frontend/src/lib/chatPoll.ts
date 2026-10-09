import type { ChatPollInfo, ChatPollVoterInfo } from '../types/chat';

/** Chat polls (045): the limits the server applies too. */
export const POLL_LIMITS = {
  question: 300,
  option: 100,
  minOptions: 2,
  maxOptions: 12,
} as const;

/** "  Vila  da Torre " and "vila da torre" are the same option. */
export const normalizeOption = (text: string): string => text.trim().split(/\s+/).join(' ').toLowerCase();

/**
 * The composer's rows: the filled ones as they are, plus one empty row at the end while there is room — WhatsApp's
 * list that grows as you type. Empty rows in the middle are kept (the user may be about to fill them).
 */
export const withTrailingEmpty = (options: readonly string[]): string[] => {
  const rows = [...options];
  while (rows.length > POLL_LIMITS.minOptions && rows[rows.length - 1] === '' && rows[rows.length - 2] === '') rows.pop();
  while (rows.length < POLL_LIMITS.minOptions) rows.push('');
  if (rows[rows.length - 1] !== '' && rows.length < POLL_LIMITS.maxOptions) rows.push('');
  return rows;
};

/** Moves row `index` one place up (-1) or down (+1); out of range = unchanged. */
export const moveOption = (options: readonly string[], index: number, delta: -1 | 1): string[] => {
  const target = index + delta;
  if (index < 0 || index >= options.length || target < 0 || target >= options.length) return [...options];
  const rows = [...options];
  [rows[index], rows[target]] = [rows[target], rows[index]];
  return rows;
};

export const removeOption = (options: readonly string[], index: number): string[] =>
  withTrailingEmpty(options.filter((_, i) => i !== index));

/** What is sent: trimmed, empty ones dropped. */
export const cleanOptions = (options: readonly string[]): string[] => options.map((o) => o.trim()).filter((o) => o.length > 0);

export interface PollErrors {
  question?: 'required' | 'tooLong';
  options?: 'tooFew' | 'tooMany' | 'tooLong' | 'repeated';
}

export const validatePoll = (question: string, options: readonly string[]): PollErrors => {
  const errors: PollErrors = {};
  const q = question.trim();
  if (!q) errors.question = 'required';
  else if (q.length > POLL_LIMITS.question) errors.question = 'tooLong';
  const list = cleanOptions(options);
  if (list.length < POLL_LIMITS.minOptions) errors.options = 'tooFew';
  else if (list.length > POLL_LIMITS.maxOptions) errors.options = 'tooMany';
  else if (list.some((o) => o.length > POLL_LIMITS.option)) errors.options = 'tooLong';
  else if (new Set(list.map(normalizeOption)).size !== list.length) errors.options = 'repeated';
  return errors;
};

export const isPollValid = (question: string, options: readonly string[]): boolean =>
  Object.keys(validatePoll(question, options)).length === 0;

export const isPollDirty = (question: string, options: readonly string[]): boolean =>
  question.trim().length > 0 || cleanOptions(options).length > 0;

/** The option the voter (a character, or null = the master) voted on, or null. */
export const myVote = (poll: ChatPollInfo, characterId: number | null): number | null =>
  poll.options.find((o) => o.voters.some((v) => v.characterId === characterId))?.optionId ?? null;

/** Tapping an option: the one already voted on withdraws the vote (null), any other one moves it there. */
export const nextVote = (poll: ChatPollInfo, characterId: number | null, optionId: number): number | null =>
  myVote(poll, characterId) === optionId ? null : optionId;

/** The poll after the voter's vote goes to `optionId` (null = withdrawn) — the optimistic update. */
export const applyVote = (poll: ChatPollInfo, voter: ChatPollVoterInfo, optionId: number | null): ChatPollInfo => {
  const options = poll.options.map((o) => {
    const voters = o.voters.filter((v) => v.characterId !== voter.characterId);
    if (o.optionId === optionId) voters.push(voter);
    return { ...o, voters, votes: voters.length };
  });
  return { ...poll, options, totalVotes: options.reduce((sum, o) => sum + o.votes, 0) };
};

/** Width of an option's bar, 0–100. */
export const percent = (votes: number, total: number): number => (total <= 0 ? 0 : Math.round((votes / total) * 100));

/** "Ver votos": the most voted first, ties in the author's order. */
export const votesByRank = (poll: ChatPollInfo) =>
  poll.options.map((o, index) => ({ option: o, index }))
    .sort((a, b) => b.option.votes - a.option.votes || a.index - b.index)
    .map(({ option }) => option);

/** What "Copiar" puts on the clipboard for a poll: the question, then one line per option with its votes. */
export const pollCopyText = (poll: ChatPollInfo): string =>
  [poll.question, ...poll.options.map((o) => `• ${o.text} — ${o.votes} ${o.votes === 1 ? 'voto' : 'votos'}`)].join('\n');
