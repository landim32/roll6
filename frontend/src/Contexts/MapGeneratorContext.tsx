import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EditorHubError } from '../Services/animationEditorService';
import { mapGeneratorService } from '../Services/mapGeneratorService';
import { mapModelService } from '../Services/mapModelService';
import { imageService } from '../Services/imageService';
import * as reducers from '../lib/mapGeneratorState';
import { INITIAL_STATE, MAX_ATTACHMENTS, base64Of, isDirty, selectedVersion } from '../lib/mapGeneratorState';
import type { GeneratorAttachment, GeneratorState } from '../lib/mapGeneratorState';
import type { MapModelInfo } from '../types/mapModel';

export type GeneratorError = 'forbidden' | 'not-found' | 'offline' | null;

interface MapGeneratorContextType {
  state: GeneratorState;
  loading: boolean;
  error: GeneratorError;
  connected: boolean;
  /** The edited map (own map), or null for a new one. */
  baseModel: MapModelInfo | null;
  dirty: boolean;
  sendRequest: (text: string) => Promise<void>;
  stopRequest: () => Promise<void>;
  newConversation: () => Promise<void>;
  select: (version: number) => void;
  attach: (attachment: Omit<GeneratorAttachment, 'id'>) => boolean;
  replaceAttachment: (attachment: GeneratorAttachment) => void;
  removeAttachment: (id: number) => void;
  /** The version was saved as a map (the page stops asking before leaving for it). */
  markSaved: (version: number) => void;
}

const MapGeneratorContext = createContext<MapGeneratorContextType | undefined>(undefined);

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(base64Of(String(reader.result)));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/**
 * The map generator page (095): one session per mounted page, scoped to the tab (Q3 = B). It connects to the agent hub,
 * opens a generator (for a new map or one of the user's own maps, whose image becomes version 0), applies every event
 * through the pure reducers of `lib/mapGeneratorState` and sends the requests for the Codex of the user's console.
 */
export const MapGeneratorProvider = ({ mapModelId, children }: { mapModelId: number | null; children: ReactNode }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<GeneratorState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GeneratorError>(null);
  const [connected, setConnected] = useState(false);
  const [baseModel, setBaseModel] = useState<MapModelInfo | null>(null);
  const connection = useRef<HubConnection | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const nextAttachment = useRef(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setState(INITIAL_STATE);
    const hub = mapGeneratorService.createConnection();
    connection.current = hub;

    const open = async () => {
      try {
        const info = await mapGeneratorService.open(hub, mapModelId);
        if (cancelled) return;
        let model: MapModelInfo | null = null;
        if (mapModelId) {
          model = await mapModelService.getById(mapModelId);
          if (cancelled) return;
          setBaseModel(model);
        }
        setState((s) => reducers.opened(s, info, model ? { mapModelId: model.mapModelId, name: model.name } : null));
        if (model?.image) {
          // The bucket sends no CORS headers: the bytes come through the API.
          const blob = await imageService.fetchStored(model.image);
          if (blob && !cancelled) {
            const base64 = await blobToBase64(blob);
            setState((s) => reducers.baseImage(s, blob.type || 'image/png', base64));
          }
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof EditorHubError ? err.code : null;
        setError(code === 'forbidden' ? 'forbidden' : code === 'not-found' ? 'not-found' : 'offline');
        setLoading(false);
      }
    };

    const offs = [
      mapGeneratorService.on(hub, 'agentStatus', (agent) => setState((s) => reducers.agentStatus(s, agent))),
      mapGeneratorService.on(hub, 'generatorQueued', (info) => setState((s) => reducers.queued(s, info.requestId, info.position))),
      mapGeneratorService.on(hub, 'generatorStarted', (info) => setState((s) => reducers.started(s, info.requestId))),
      mapGeneratorService.on(hub, 'generatorProgress', (info) => setState((s) => reducers.progress(s, info.requestId, info.event))),
      mapGeneratorService.on(hub, 'generatorImage', (image) => setState((s) => reducers.imageArrived(s, image))),
      mapGeneratorService.on(hub, 'generatorFinished', (info) => {
        const notice = info.outcome.kind === 'done'
          ? null
          : info.outcome.message || t(info.outcome.kind === 'stopped' ? 'mapGenerator.stopped' : 'mapGenerator.failed');
        if (info.outcome.kind === 'failed') toast.error(notice ?? t('mapGenerator.failed'));
        setState((s) => reducers.finished(s, info.requestId, info.outcome, info.text, notice));
      }),
    ];
    hub.onreconnecting(() => setConnected(false));
    // A new connection is a new session on the server: the versions stay in the tab.
    hub.onreconnected(() => {
      setConnected(true);
      void open();
    });
    hub.onclose(() => setConnected(false));
    hub.start()
      .then(() => {
        if (cancelled) return;
        setConnected(true);
        return open();
      })
      .catch(() => {
        if (cancelled) return;
        setError('offline');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      connection.current = null;
      void hub.stop();
    };
  }, [mapModelId, t]);

  const errorToast = useCallback((err: unknown) => {
    const code = err instanceof EditorHubError ? err.code : null;
    const key = code === 'busy' ? 'mapGenerator.error.busy' : code === 'no-agent' ? 'mapGenerator.error.noAgent'
      : code === 'invalid' ? 'mapGenerator.error.invalid' : code === 'not-found' ? 'mapGenerator.error.session' : null;
    toast.error(key ? t(key) : err instanceof Error ? err.message : t('common.unknownError'));
  }, [t]);

  const sendRequest = useCallback(async (text: string) => {
    const hub = connection.current;
    const current = stateRef.current;
    if (!hub || !current.sessionId) return;
    const attachments = current.attachments;
    try {
      const requestId = await mapGeneratorService.sendRequest(hub, {
        sessionId: current.sessionId,
        text,
        images: attachments.map((a) => ({ png: base64Of(a.marked), caption: a.caption })),
        // The version on the stage is where the request starts (the edited map's image at first).
        baseImage: selectedVersion(current)?.base64 ?? null,
      });
      setState((s) => reducers.sent(s, requestId, text, attachments.map((a) => a.marked)));
    } catch (err) {
      errorToast(err);
    }
  }, [errorToast]);

  const stopRequest = useCallback(async () => {
    const hub = connection.current;
    const request = stateRef.current.request;
    if (!hub || !request) return;
    try {
      await mapGeneratorService.stopRequest(hub, request.id);
    } catch (err) {
      errorToast(err);
    }
  }, [errorToast]);

  const newConversation = useCallback(async () => {
    const hub = connection.current;
    const sessionId = stateRef.current.sessionId;
    if (!hub || !sessionId) return;
    try {
      await mapGeneratorService.newConversation(hub, sessionId);
      setState((s) => reducers.conversationCleared(s));
    } catch (err) {
      errorToast(err);
    }
  }, [errorToast]);

  const select = useCallback((version: number) => setState((s) => reducers.select(s, version)), []);

  const attach = useCallback((attachment: Omit<GeneratorAttachment, 'id'>): boolean => {
    if (stateRef.current.attachments.length >= MAX_ATTACHMENTS) {
      toast.warning(t('mapGenerator.marks.max', { count: MAX_ATTACHMENTS }));
      return false;
    }
    setState((s) => reducers.attach(s, { ...attachment, id: nextAttachment.current++ }));
    return true;
  }, [t]);

  const replaceAttachment = useCallback((attachment: GeneratorAttachment) => setState((s) => reducers.replaceAttachment(s, attachment)), []);
  const removeAttachment = useCallback((id: number) => setState((s) => reducers.removeAttachment(s, id)), []);
  const markSaved = useCallback((version: number) => setState((s) => reducers.saved(s, version)), []);

  const dirty = isDirty(state);

  const value = useMemo<MapGeneratorContextType>(() => ({
    state, loading, error, connected, baseModel, dirty, sendRequest, stopRequest, newConversation, select, attach,
    replaceAttachment, removeAttachment, markSaved,
  }), [state, loading, error, connected, baseModel, dirty, sendRequest, stopRequest, newConversation, select, attach,
    replaceAttachment, removeAttachment, markSaved]);

  return <MapGeneratorContext.Provider value={value}>{children}</MapGeneratorContext.Provider>;
};

export default MapGeneratorContext;
