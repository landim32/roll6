import { describe, expect, it } from 'vitest';
import {
  addRecipient, matchesQuery, mentionAt, mentionOptions, removeMention, removeRecipient, whisperPayload,
} from './whisper';
import type { MentionContext, WhisperRecipient } from './whisper';

const aria: WhisperRecipient = { characterId: 80, name: 'Aria', imageUrl: null };
const bram: WhisperRecipient = { characterId: 81, name: 'Bram de Ândria', imageUrl: 'b.png' };
const master: WhisperRecipient = { characterId: null, name: 'Mestre', imageUrl: null };

const context = (over: Partial<MentionContext> = {}): MentionContext => ({
  party: [aria, bram], ownCharacterId: 80, speakerIsMaster: false, chosen: [], masterLabel: 'Mestre', ...over,
});

describe('mentionAt', () => {
  it('finds "@query" at the caret, only at a word start', () => {
    expect(mentionAt('@br', 3)).toEqual({ start: 0, end: 3, query: 'br' });
    expect(mentionAt('oi @', 4)).toEqual({ start: 3, end: 4, query: '' });
    expect(mentionAt('linha\n@me', 9)).toEqual({ start: 6, end: 9, query: 'me' });
    expect(mentionAt('a@b.com', 7)).toBeNull();
    expect(mentionAt('@bram ok', 8)).toBeNull();
    expect(mentionAt('sem arroba', 10)).toBeNull();
  });
});

describe('mentionOptions', () => {
  it('offers the master and the other characters, filtered by any word, without accents', () => {
    expect(mentionOptions(context(), '')).toEqual([master, bram]);
    expect(mentionOptions(context(), 'and')).toEqual([bram]);
    expect(mentionOptions(context(), 'mes')).toEqual([master]);
    expect(matchesQuery('Bram de Ândria', 'ANDR')).toBe(true);
  });

  it('never offers the speaker, the chosen ones or the master to himself', () => {
    expect(mentionOptions(context({ chosen: [bram] }), '')).toEqual([master]);
    expect(mentionOptions(context({ speakerIsMaster: true, ownCharacterId: null }), '')).toEqual([aria, bram]);
  });
});

describe('recipients', () => {
  it('removes the typed mention and builds the payload', () => {
    expect(removeMention('oi @br tudo', { start: 3, end: 6, query: 'br' })).toEqual({ text: 'oi tudo', caret: 3 });
    const chosen = addRecipient(addRecipient([], bram), master);
    expect(addRecipient(chosen, bram)).toHaveLength(2);
    expect(whisperPayload(chosen)).toEqual({ whisperCharacterIds: [81], whisperMaster: true });
    expect(whisperPayload(removeRecipient(chosen, master))).toEqual({ whisperCharacterIds: [81], whisperMaster: false });
    expect(whisperPayload([])).toEqual({});
  });
});
