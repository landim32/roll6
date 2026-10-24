/** Whispers in the chat (047): the "@" autocomplete and the recipients sent with a message, roll or action. */

/** A recipient: an approved character of the campaign, or the master (characterId null). */
export interface WhisperRecipient {
  characterId: number | null;
  name: string;
  imageUrl: string | null;
}

/** An "@word" being typed: where it starts and ends in the text and what follows the "@". */
export interface MentionMatch {
  start: number;
  end: number;
  query: string;
}

/** What a whisper adds to a send (nothing for a public message). */
export interface WhisperPayload {
  whisperCharacterIds?: number[];
  whisperMaster?: boolean;
}

const MAX_QUERY = 40;

/**
 * The "@query" right before the caret, or null. The "@" must start the text or follow a space/new line (an e-mail
 * like "a@b" never opens the list), and the query can't hold spaces.
 */
export const mentionAt = (text: string, caret: number): MentionMatch | null => {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (/\s/.test(query) || query.length > MAX_QUERY) return null;
  return { start: at, end: caret, query };
};

/** Lowercase without accents: "Ândria" matches "and". */
export const fold = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Whether `name` has a word starting with `query` (accent/case-insensitive); an empty query matches everything. */
export const matchesQuery = (name: string, query: string): boolean => {
  const q = fold(query.trim());
  if (!q) return true;
  return fold(name).split(/\s+/).some((word) => word.startsWith(q)) || fold(name).startsWith(q);
};

export interface MentionContext {
  /** Approved characters of the campaign. */
  party: readonly WhisperRecipient[];
  /** The speaker's character (never offered); null when speaking as the master. */
  ownCharacterId: number | null;
  /** The master can't whisper to himself. */
  speakerIsMaster: boolean;
  chosen: readonly WhisperRecipient[];
  /** Label of the master entry ("Mestre"). */
  masterLabel: string;
}

const sameRecipient = (a: WhisperRecipient, b: WhisperRecipient) => a.characterId === b.characterId;

/** What the "@" list offers: the master first, then the characters, minus the speaker's own and those chosen. */
export const mentionOptions = (context: MentionContext, query: string): WhisperRecipient[] => {
  const options: WhisperRecipient[] = [];
  const master: WhisperRecipient = { characterId: null, name: context.masterLabel, imageUrl: null };
  if (!context.speakerIsMaster && !context.chosen.some((c) => sameRecipient(c, master)) && matchesQuery(master.name, query))
    options.push(master);
  for (const character of context.party) {
    if (character.characterId === null || character.characterId === context.ownCharacterId) continue;
    if (context.chosen.some((c) => sameRecipient(c, character))) continue;
    if (matchesQuery(character.name, query)) options.push(character);
  }
  return options;
};

/** The text without the "@query" just chosen, and where the caret goes. */
export const removeMention = (text: string, match: MentionMatch): { text: string; caret: number } => {
  const after = text.slice(match.end).replace(/^ /, '');
  return { text: text.slice(0, match.start) + after, caret: match.start };
};

export const addRecipient = (chosen: readonly WhisperRecipient[], recipient: WhisperRecipient): WhisperRecipient[] =>
  chosen.some((c) => sameRecipient(c, recipient)) ? [...chosen] : [...chosen, recipient];

export const removeRecipient = (chosen: readonly WhisperRecipient[], recipient: WhisperRecipient): WhisperRecipient[] =>
  chosen.filter((c) => !sameRecipient(c, recipient));

/** Who answers a whisper (102). */
export interface ReplyViewer {
  userId: number | null;
  /** The character the reply is spoken by, or null (the master's own voice). */
  speakerCharacterId: number | null;
  /** The campaign master never whispers to "Mestre". */
  isMaster: boolean;
  /** Approved characters of the campaign. */
  approvedIds: ReadonlySet<number>;
  masterLabel: string;
}

interface WhisperedItem {
  userId: number;
  characterId: number | null;
  displayName: string;
  displayImageUrl: string | null;
  whisper?: { master: boolean; recipients: { characterId: number | null; name: string; imageUrl: string | null }[] } | null;
}

/**
 * 102: the recipients a reply to a whisper starts with (Q1 = B: only pre-filled, the user may change them) — the one
 * who sent it (its character, or "Mestre" when the master spoke or the character is gone); replying to one's own whisper
 * keeps its recipients. A public item gives none.
 */
export const replyRecipients = (item: WhisperedItem, viewer: ReplyViewer): WhisperRecipient[] => {
  if (!item.whisper) return [];
  const master: WhisperRecipient = { characterId: null, name: viewer.masterLabel, imageUrl: null };
  if (viewer.userId !== null && item.userId === viewer.userId) {
    const characters = item.whisper.recipients
      .filter((r) => r.characterId !== null && r.characterId !== viewer.speakerCharacterId)
      .map((r) => ({ characterId: r.characterId, name: r.name, imageUrl: r.imageUrl }));
    return item.whisper.master && !viewer.isMaster ? [master, ...characters] : characters;
  }
  if (item.characterId !== null && viewer.approvedIds.has(item.characterId)) {
    return item.characterId === viewer.speakerCharacterId
      ? []
      : [{ characterId: item.characterId, name: item.displayName, imageUrl: item.displayImageUrl }];
  }
  return viewer.isMaster ? [] : [master];
};

/** Same recipients, in any order. */
export const sameRecipients = (a: readonly WhisperRecipient[], b: readonly WhisperRecipient[]): boolean =>
  a.length === b.length && a.every((x) => b.some((y) => sameRecipient(x, y)));

/** The fields a send carries: none when public. */
export const whisperPayload = (chosen: readonly WhisperRecipient[]): WhisperPayload => {
  if (chosen.length === 0) return {};
  const ids = chosen.filter((c) => c.characterId !== null).map((c) => c.characterId as number);
  const master = chosen.some((c) => c.characterId === null);
  return { whisperCharacterIds: ids, whisperMaster: master };
};
