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
  deleted: boolean;
  canDelete: boolean;
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
}

/** A 3d6 roll in the chat; `text` is the optional reason. */
export interface ChatRollInfo {
  characterId: number | null;
  text?: string | null;
}

export interface ChatAudioUploadInfo {
  fileName: string;
  url: string | null;
  contentType: string;
}
