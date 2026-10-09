/**
 * The campaign chat (041). The chat is the campaign's whole timeline: what people say, every turn record and the
 * end-of-turn dividers — mirror of the backend ChatItemInfo / ChatPageInfo.
 */

export const CHAT_KIND = {
  text: 'text',
  image: 'image',
  audio: 'audio',
  movement: 'movement',
  action: 'action',
  actionResult: 'actionResult',
  characterUpdate: 'characterUpdate',
  narration: 'narration',
  turnFinished: 'turnFinished',
  /** 3d6 rolled in the chat, drawn by the server. */
  roll: 'roll',
  /** "Rodrigo cutucou Ana e Bruno" (043): a gray line, never deleted. */
  poke: 'poke',
  /** A poll (045): a question, 2–12 options, one vote per character and one for the master. */
  poll: 'poll',
} as const;

export type ChatKind = (typeof CHAT_KIND)[keyof typeof CHAT_KIND];

export interface ChatPointInfo {
  x: number;
  y: number;
  look: number;
  lookName: string;
}

export interface ChatChangeInfo {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

export interface ChatItemInfo {
  /** "t{turnId}". */
  key: string;
  /** "{ticks}_{turnId}": position in the timeline. */
  cursor: string;
  kind: ChatKind;
  turnId: number;
  campaignId: number;
  turnNo: number;
  createdAt: string;
  userId: number;
  mapId: number | null;
  characterId: number | null;
  npcId: number | null;
  mapNpcId: number | null;
  displayName: string;
  displayImageUrl: string | null;
  /** Who made a turn record when it isn't the one it is about ("GM (Ana)"). */
  authorLabel: string | null;
  /** Message/caption; narration markdown; for other turn records the summary's line. */
  text: string | null;
  /** Text of an action or action result. */
  description: string | null;
  before: ChatPointInfo | null;
  after: ChatPointInfo | null;
  moved: number | null;
  movedTotal: number | null;
  changes: ChatChangeInfo[] | null;
  imageUrl: string | null;
  audioUrl: string | null;
  audioSeconds: number | null;
  audioType: string | null;
  /** The three faces of a roll (kind `roll`). */
  dice?: number[] | null;
  /** An action replaced, reset or deleted (044): "Ação cancelada". */
  cancelled?: boolean;
  /** The entry this one answers (044). */
  replyTo?: ChatReplyInfo | null;
  /** Curtir / Amei of each user (044). */
  reactions?: ChatReactionInfo[];
  canReply?: boolean;
  canReact?: boolean;
  /** A character's text can become its action ('action'), its action can become text ('message'). */
  canConvert?: 'action' | 'message' | null;
  /** The poll of a `poll` entry (045): votes are public. */
  poll?: ChatPollInfo | null;
  deleted: boolean;
  canDelete: boolean;
}

export interface ChatReplyInfo {
  key: string;
  turnId: number;
  displayName: string;
  kind: ChatKind;
  excerpt: string;
  deleted: boolean;
  cancelled: boolean;
}

export const REACTION = {
  like: 'like',
  love: 'love',
  /** Gargalhada (045). */
  laugh: 'laugh',
} as const;

export type ReactionKind = (typeof REACTION)[keyof typeof REACTION];

export interface ChatReactionInfo {
  userId: number;
  name: string;
  kind: ReactionKind;
}

/** One voter of a poll: a character, or the master (characterId null, "Mestre"). */
export interface ChatPollVoterInfo {
  characterId: number | null;
  name: string;
  imageUrl: string | null;
}

export interface ChatPollOptionInfo {
  optionId: number;
  text: string;
  votes: number;
  voters: ChatPollVoterInfo[];
}

export interface ChatPollInfo {
  question: string;
  totalVotes: number;
  /** In the order the author wrote them. */
  options: ChatPollOptionInfo[];
}

export interface ChatPollCreateInfo {
  /** One of the user's approved characters; null = the master. */
  characterId: number | null;
  question: string;
  options: string[];
  replyToTurnId?: number | null;
}

export interface ChatPageInfo {
  items: ChatItemInfo[];
  hasMore: boolean;
  unreadCount: number;
  firstUnreadCursor: string | null;
}

export interface ChatSendInfo {
  /** One of the user's approved characters; null = the master. */
  characterId: number | null;
  text?: string | null;
  image?: string | null;
  audio?: string | null;
  audioSeconds?: number | null;
  /** The entry this message answers (044). */
  replyToTurnId?: number | null;
}

/** A 3d6 roll in the chat; `text` is the optional reason. */
export interface ChatRollInfo {
  characterId: number | null;
  text?: string | null;
  replyToTurnId?: number | null;
}

export interface ChatAudioUploadInfo {
  fileName: string;
  url: string | null;
  contentType: string;
}
