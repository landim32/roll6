import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';
import { API_URL, readStoredSession } from './apiHelpers';
import type { EditorErrorCode, EditorEvents, EditorStateInfo, PrintResult, RequestPayload } from '../types/animationEditor';
import { EDITOR_ERROR } from '../types/animationEditor';

/** Hub path (same origin through the Vite/nginx proxy, like /api). */
const HUB_URL = `${API_URL}/hubs/animation`;

const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

/** The hub refused with one of its codes (`HubException("busy")`…); anything else is a plain Error. */
export class EditorHubError extends Error {
  readonly code: EditorErrorCode;

  constructor(code: EditorErrorCode) {
    super(code);
    this.name = 'EditorHubError';
    this.code = code;
  }
}

const CODES = new Set<string>(Object.values(EDITOR_ERROR));

/** SignalR wraps a `HubException` message as "An unexpected error occurred invoking 'X' on the server. HubException: busy". */
export const hubErrorCode = (error: unknown): EditorErrorCode | null => {
  const message = error instanceof Error ? error.message : String(error);
  const match = /HubException:\s*([a-z-]+)/i.exec(message);
  const code = match ? match[1] : message.trim();
  return CODES.has(code) ? (code as EditorErrorCode) : null;
};

const translate = (error: unknown): never => {
  const code = hubErrorCode(error);
  if (code) throw new EditorHubError(code);
  throw error instanceof Error ? error : new Error(String(error));
};

/**
 * Animation Editor Service (086) — the SignalR connection of the editor page to `/hubs/animation`: opens the editor of
 * one animation, sends requests for the local Claude, stops them, starts a new conversation, and listens to the hub.
 * Everything the page stores (versions) goes through the REST `animationService`.
 */
class AnimationEditorService {
  createConnection(): HubConnection {
    return new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => readStoredSession()?.token ?? '' })
      .withAutomaticReconnect(RECONNECT_DELAYS)
      .configureLogging(LogLevel.Warning)
      .build();
  }

  async openEditor(connection: HubConnection, animationId: number): Promise<EditorStateInfo> {
    try {
      return await connection.invoke<EditorStateInfo>('OpenEditor', animationId);
    } catch (error) {
      return translate(error);
    }
  }

  async closeEditor(connection: HubConnection): Promise<void> {
    await connection.invoke('CloseEditor');
  }

  async sendRequest(connection: HubConnection, payload: RequestPayload): Promise<number> {
    try {
      return await connection.invoke<number>('SendRequest', payload);
    } catch (error) {
      return translate(error);
    }
  }

  async stopRequest(connection: HubConnection, requestId: number): Promise<void> {
    try {
      await connection.invoke('StopRequest', requestId);
    } catch (error) {
      translate(error);
    }
  }

  async newConversation(connection: HubConnection, animationId: number): Promise<void> {
    try {
      await connection.invoke('NewConversation', animationId);
    } catch (error) {
      translate(error);
    }
  }

  /** The prints this tab took for the Claude (094), or why it could not. */
  async printResult(connection: HubConnection, result: PrintResult): Promise<void> {
    await connection.invoke('PrintResult', result);
  }

  /** Listens to one server → browser method; returns the function that stops listening. */
  on<K extends keyof EditorEvents>(connection: HubConnection, event: K, handler: (payload: EditorEvents[K]) => void): () => void {
    connection.on(event, handler);
    return () => connection.off(event, handler);
  }
}

export const animationEditorService = new AnimationEditorService();
export default AnimationEditorService;
