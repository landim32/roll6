import { describe, expect, it } from 'vitest';
import {
  applyVote, cleanOptions, isPollDirty, isPollValid, moveOption, myVote, nextVote, normalizeOption, percent, pollCopyText,
  removeOption, validatePoll, votesByRank, withTrailingEmpty, POLL_LIMITS,
} from './chatPoll';
import type { ChatPollInfo } from '../types/chat';

const poll = (): ChatPollInfo => ({
  question: 'Para onde vamos?',
  totalVotes: 2,
  options: [
    { optionId: 1, text: 'Floresta', votes: 1, voters: [{ characterId: 80, name: 'Aria', imageUrl: null }] },
    { optionId: 2, text: 'Caverna', votes: 1, voters: [{ characterId: null, name: 'Mestre', imageUrl: null }] },
    { optionId: 3, text: 'Vila', votes: 0, voters: [] },
  ],
});

describe('poll composer rows', () => {
  it('always ends with one empty row while there is room', () => {
    expect(withTrailingEmpty([])).toEqual(['', '']);
    expect(withTrailingEmpty(['A', ''])).toEqual(['A', '']);
    expect(withTrailingEmpty(['A', 'B'])).toEqual(['A', 'B', '']);
    expect(withTrailingEmpty(['A', 'B', '', ''])).toEqual(['A', 'B', '']);
    const full = Array.from({ length: POLL_LIMITS.maxOptions }, (_, i) => `O${i}`);
    expect(withTrailingEmpty(full)).toHaveLength(POLL_LIMITS.maxOptions);
  });

  it('moves and removes rows', () => {
    expect(moveOption(['A', 'B', 'C'], 2, -1)).toEqual(['A', 'C', 'B']);
    expect(moveOption(['A', 'B'], 0, -1)).toEqual(['A', 'B']);
    expect(removeOption(['A', 'B', 'C', ''], 1)).toEqual(['A', 'C', '']);
  });

  it('cleans what is sent', () => {
    expect(cleanOptions([' A ', '', '  ', 'B'])).toEqual(['A', 'B']);
    expect(normalizeOption('  Vila   da Torre ')).toBe('vila da torre');
  });
});

describe('validatePoll', () => {
  it('needs a question and 2–12 different options', () => {
    expect(validatePoll('', ['A', 'B'])).toEqual({ question: 'required' });
    expect(validatePoll('x'.repeat(301), ['A', 'B'])).toEqual({ question: 'tooLong' });
    expect(validatePoll('?', ['A', ''])).toEqual({ options: 'tooFew' });
    expect(validatePoll('?', ['Vila', ' vila '])).toEqual({ options: 'repeated' });
    expect(validatePoll('?', ['A', 'x'.repeat(101)])).toEqual({ options: 'tooLong' });
    expect(validatePoll('?', Array.from({ length: 13 }, (_, i) => `${i}`))).toEqual({ options: 'tooMany' });
    expect(isPollValid('Para onde?', ['Floresta', 'Caverna', ''])).toBe(true);
  });

  it('is dirty once something was typed', () => {
    expect(isPollDirty('', ['', ''])).toBe(false);
    expect(isPollDirty('', ['A', ''])).toBe(true);
  });
});

describe('votes', () => {
  it('finds the voter’s vote and toggles like WhatsApp', () => {
    expect(myVote(poll(), 80)).toBe(1);
    expect(myVote(poll(), null)).toBe(2);
    expect(myVote(poll(), 81)).toBeNull();
    expect(nextVote(poll(), 80, 1)).toBeNull();
    expect(nextVote(poll(), 80, 3)).toBe(3);
  });

  it('applies a vote optimistically: moves, withdraws, recounts', () => {
    const aria = { characterId: 80, name: 'Aria', imageUrl: null };
    const moved = applyVote(poll(), aria, 3);
    expect(moved.options.map((o) => o.votes)).toEqual([0, 1, 1]);
    expect(moved.totalVotes).toBe(2);
    const withdrawn = applyVote(poll(), aria, null);
    expect(withdrawn.options.map((o) => o.votes)).toEqual([0, 1, 0]);
    expect(withdrawn.totalVotes).toBe(1);
  });

  it('ranks, sizes bars and copies', () => {
    const p = applyVote(poll(), { characterId: 81, name: 'Bram', imageUrl: null }, 2);
    expect(votesByRank(p).map((o) => o.text)).toEqual(['Caverna', 'Floresta', 'Vila']);
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
    expect(pollCopyText(poll())).toBe('Para onde vamos?\n• Floresta — 1 voto\n• Caverna — 1 voto\n• Vila — 0 votos');
  });
});
