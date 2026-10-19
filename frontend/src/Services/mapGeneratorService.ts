import type { HubConnection } from '@microsoft/signalr';
import { animationEditorService, EditorHubError, hubErrorCode } from './animationEditorService';
import type { GeneratorEvents, GeneratorOpened, GeneratorRequestPayload } from '../types/mapGenerator';

const translate = (error: unknown): never => {
  const code = hubErrorCode(error);
  if (code) throw new EditorHubError(code);
  throw error instanceof Error ? error : new Error(String(error));
};

/**
 * Map Generator Service (095) — the generator page's SignalR calls on `/hubs/animation` (the same agent hub as the
 * animation editor): open a session, send requests for the Codex of the user's console, stop them, start a new
 * conversation, and listen to its events. Saving goes through the REST image and map model services.
 */
class MapGeneratorService {
  createConnection(): HubConnection {
    return animationEditorService.createConnection();
  }

  async open(connection: HubConnection, mapModelId: number | null): Promise<GeneratorOpened> {
    try {
      return await connection.invoke<GeneratorOpened>('OpenGenerator', mapModelId);
    } catch (error) {
      return translate(error);
    }
  }

  async sendRequest(connection: HubConnection, payload: GeneratorRequestPayload): Promise<number> {
    try {
      return await connection.invoke<number>('SendGeneratorRequest', payload);
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

  async newConversation(connection: HubConnection, sessionId: string): Promise<void> {
    try {
      await connection.invoke('NewGeneratorConversation', sessionId);
    } catch (error) {
      translate(error);
    }
  }

  on<K extends keyof GeneratorEvents>(connection: HubConnection, event: K, handler: (payload: GeneratorEvents[K]) => void): () => void {
    connection.on(event, handler);
    return () => connection.off(event, handler);
  }
}

export const mapGeneratorService = new MapGeneratorService();
export default MapGeneratorService;
