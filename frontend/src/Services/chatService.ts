import type {
  AskStatusInfo, ChatAudioUploadInfo, ChatItemInfo, ChatPageInfo, ChatPollCreateInfo, ChatRollInfo, ChatSendInfo, ReactionKind,
} from '../types/chat';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

interface ChatServiceConfig {
  onUnauthorized?: () => void;
}

export interface ChatPageQuery {
  before?: string | null;
  after?: string | null;
  limit?: number;
}

/** Chat Service — the campaign chat (041): read, say, delete, mark as read and upload a recording. */
class ChatService {
  private config: ChatServiceConfig;

  constructor(config: ChatServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** A page, oldest first: newest without cursor, older with `before`, newer with `after`. */
  async list(campaignId: number, { before, after, limit }: ChatPageQuery = {}): Promise<ChatPageInfo> {
    const query = new URLSearchParams();
    if (before) query.set('before', before);
    if (after) query.set('after', after);
    if (limit) query.set('limit', String(limit));
    const suffix = query.toString() ? `?${query}` : '';
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/chat${suffix}`, { headers: getHeaders(true) });
    return this.handleResponse<ChatPageInfo>(response);
  }

  async send(campaignId: number, info: ChatSendInfo): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/chat`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(info),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** Rolls 3d6: the server draws the dice and everyone sees the same result. */
  async roll(campaignId: number, info: ChatRollInfo): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/chat/roll`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(info),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** A poll in the chat (045). */
  async createPoll(campaignId: number, info: ChatPollCreateInfo): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/chat/poll`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(info),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** Puts the voter's vote on `optionId`, or withdraws it (null) (045). `characterId` null = the master. */
  async vote(turnId: number, characterId: number | null, optionId: number | null): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}/vote`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ characterId, optionId }),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** Curtir / Amei / Gargalhada, or null to remove the reaction (044, 045). */
  async react(turnId: number, kind: ReactionKind | null): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}/reaction`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ kind }),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** The master switches the voice of a message he wrote: one of his characters, or null for the master (079). */
  async setSpeaker(turnId: number, characterId: number | null): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}/speaker`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify({ characterId }),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** The master closes a poll (077): no more votes, only the result. */
  async closePoll(turnId: number): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}/poll/close`, { method: 'POST', headers: getHeaders(true), body: '{}' });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** "Perguntar" (093): a question to the master's Claude; `private` = only the author and the master. */
  async ask(campaignId: number, info: { characterId: number | null; text: string; private: boolean }): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/chat/ask`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(info),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** Whether "Perguntar" is available now and the caller's waiting question (093). */
  async askStatus(campaignId: number): Promise<AskStatusInfo> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/ask`, { headers: getHeaders(true) });
    return this.handleResponse<AskStatusInfo>(response);
  }

  /** The master corrects an answer of his Claude (093). */
  async editAnswer(turnId: number, text: string): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}/answer`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify({ text }),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  /** A character's text → its action ('action'), or the action → text ('message') (044). */
  async convert(turnId: number, to: 'action' | 'message'): Promise<ChatItemInfo> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}/convert`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify({ to }),
    });
    return this.handleResponse<ChatItemInfo>(response);
  }

  async remove(turnId: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/chat/${turnId}`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }

  /** Moves the user's read mark forward up to `until` (a cursor). */
  async markRead(campaignId: number, until: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/campaign/${campaignId}/chat/read`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ until }),
    });
    return this.handleResponse<void>(response);
  }

  /** Stores a recording as it came (WebM, MP4 or Ogg, at most 5 MB). */
  async uploadAudio(file: Blob, fileName: string): Promise<ChatAudioUploadInfo> {
    const body = new FormData();
    body.append('file', file, fileName);
    const response = await fetch(`${API_URL}/api/chat/audio`, { method: 'POST', headers: getHeaders(true, false), body });
    return this.handleResponse<ChatAudioUploadInfo>(response);
  }
}

export const chatService = new ChatService();
export default ChatService;
