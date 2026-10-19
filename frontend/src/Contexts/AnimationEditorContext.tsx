import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { animationEditorService, EditorHubError } from '../Services/animationEditorService';
import { animationService } from '../Services/animationService';
import { createHistory, versionText } from '../lib/animationHistory';
import type { AnimationHistory, HistoryCounts } from '../lib/animationHistory';
import { parseAnimationText, toRoll6Clip } from '../lib/animationFormat';
import type { AnimationFile } from '../lib/animationFormat';
import { uploadThumbnail } from '../lib/thumbnailUpload';
import * as reducers from '../lib/editorState';
import { INITIAL_STATE, MAX_ATTACHMENTS, base64Of, isDirty } from '../lib/editorState';
import type { EditorState, PrintAttachment } from '../lib/editorState';
import type { TokenInfo } from '../types/token';
import type { EditorErrorCode, RequestOutcome } from '../types/animationEditor';

/** The remembered token (the model shown) and the skeleton toggle, per device. */
export const EDITOR_TOKEN_KEY = 'roll6:editor-token';
export const EDITOR_SKELETON_KEY = 'roll6:editor-skeleton';

export type EditorError = 'forbidden' | 'not-found' | 'offline' | null;

interface AnimationEditorContextType {
  state: EditorState;
  loading: boolean;
  /** Why the editor could not open (another user's animation, an unknown id, no connection). */
  error: EditorError;
  /** The hub connection is up (the page polls nothing: without it the composer waits). */
  connected: boolean;
  history: HistoryCounts;
  tokenId: number | null;
  setToken: (token: TokenInfo | null) => void;
  skeleton: boolean;
  setSkeleton: (on: boolean) => void;
  /** A bone turned on the stage: an unsaved edit pushed to the history (091 — nothing reaches the library). */
  saveContent: (file: AnimationFile) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  /** The edit version differs from the library's (091). */
  dirty: boolean;
  /** "Salvar" is running. */
  saving: boolean;
  /** "Salvar" (091): validates the edit version and writes it to the library with a fresh card picture. */
  save: () => Promise<void>;
  /** "Descartar" (091): back to the library's version. */
  discard: () => void;
  sendRequest: (text: string, modelName: string | null) => Promise<void>;
  stopRequest: () => Promise<void>;
  newConversation: () => Promise<void>;
  attachPrint: (print: Omit<PrintAttachment, 'id'>) => boolean;
  replacePrint: (print: PrintAttachment) => void;
  removePrint: (id: number) => void;
}

const AnimationEditorContext = createContext<AnimationEditorContextType | undefined>(undefined);

const readToken = (): number | null => {
  try {
    const value = localStorage.getItem(EDITOR_TOKEN_KEY);
    return value ? Number(value) || null : null;
  } catch {
    return null;
  }
};

const readSkeleton = (): boolean => {
  try {
    return localStorage.getItem(EDITOR_SKELETON_KEY) === 'on';
  } catch {
    return false;
  }
};

/**
 * The animation editor page (086): one provider per open tab, scoped to one animation. It connects to
 * `/hubs/animation`, opens the editor, applies every hub event through the pure reducers of `lib/editorState`, keeps
 * the version history of this tab and sends requests for the local Claude. Since 091 every change (a turned bone,
 * undo/redo, a file of the Claude) stays in the tab's edit version until "Salvar" writes it through the REST API.
 */
export const AnimationEditorProvider = ({ animationId, children }: { animationId: number; children: ReactNode }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<EditorError>(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<HistoryCounts>({ undo: 0, redo: 0 });
  const [tokenId, setTokenId] = useState<number | null>(readToken);
  const [skeleton, setSkeletonState] = useState<boolean>(readSkeleton);
  const connection = useRef<HubConnection | null>(null);
  const versions = useRef<AnimationHistory>(createHistory());
  /** The texts of the versions this tab saved and still waits the echo of. */
  const ownSaves = useRef(new Set<string>());
  const nextPrintId = useRef(1);
  /** The requests this tab sent: only their drafts become edits here (091). */
  const ownRequests = useRef(new Set<number>());
  const stateRef = useRef(state);
  stateRef.current = state;
  const [saving, setSaving] = useState(false);

  const refreshHistory = useCallback(() => setHistory(versions.current.counts), []);

  const noticeFor = useCallback((outcome: RequestOutcome): string | null => {
    if (outcome.kind === 'done') return null;
    return outcome.message || t(outcome.kind === 'stopped' ? 'editor.conversation.stopped' : 'editor.conversation.failed');
  }, [t]);

  // Connect, open the editor and listen, once per animation.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setState(INITIAL_STATE);
    versions.current = createHistory();
    refreshHistory();
    const hub = animationEditorService.createConnection();
    connection.current = hub;

    const open = async () => {
      try {
        const info = await animationEditorService.openEditor(hub, animationId);
        if (cancelled) return;
        versions.current.push(versionText(info.content));
        refreshHistory();
        setState((current) => reducers.opened(current, info));
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof EditorHubError ? err.code : null;
        setError(code === 'forbidden' ? 'forbidden' : code === 'not-found' ? 'not-found' : 'offline');
        setLoading(false);
      }
    };

    const offs = [
      animationEditorService.on(hub, 'agentStatus', (agent) => setState((s) => reducers.agentStatus(s, agent))),
      animationEditorService.on(hub, 'requestQueued', (info) => setState((s) => reducers.requestQueued(s, info))),
      animationEditorService.on(hub, 'requestStarted', (info) => setState((s) => reducers.requestStarted(s, info))),
      animationEditorService.on(hub, 'requestProgress', (info) => setState((s) => reducers.requestProgress(s, info))),
      animationEditorService.on(hub, 'requestFinished', (info) => {
        const notice = noticeFor(info.outcome);
        if (info.outcome.kind === 'failed') toast.error(notice ?? t('editor.conversation.failed'));
        setState((s) => reducers.requestFinished(s, info, notice));
      }),
      animationEditorService.on(hub, 'animationVersion', (version) => {
        const text = versionText(version.content);
        if (ownSaves.current.delete(text)) {
          // Our own save coming back: the stage already shows it, the history already has it.
          setState((s) => reducers.ownVersion(s, version.content));
          return;
        }
        versions.current.push(text);
        refreshHistory();
        setState((s) => reducers.animationVersion(s, version));
      }),
      animationEditorService.on(hub, 'draftVersion', (info) => {
        if (!ownRequests.current.has(info.requestId)) return;
        versions.current.push(versionText(info.content));
        refreshHistory();
        setState((s) => reducers.draftVersion(s, info, true));
      }),
      animationEditorService.on(hub, 'conversationCleared', (info) => setState((s) => reducers.conversationCleared(s, info))),
    ];
    hub.onreconnecting(() => setConnected(false));
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
  }, [animationId, noticeFor, refreshHistory, t]);

  const setToken = useCallback((token: TokenInfo | null) => {
    setTokenId(token?.tokenId ?? null);
    try {
      if (token) localStorage.setItem(EDITOR_TOKEN_KEY, String(token.tokenId));
      else localStorage.removeItem(EDITOR_TOKEN_KEY);
    } catch {
      // The choice is only forgotten.
    }
  }, []);

  const setSkeleton = useCallback((on: boolean) => {
    setSkeletonState(on);
    try {
      localStorage.setItem(EDITOR_SKELETON_KEY, on ? 'on' : 'off');
    } catch {
      // The choice is only forgotten.
    }
  }, []);

  /** A bone turned on the stage (091): only the edit version and the history change; the stage already shows it. */
  const saveContent = useCallback(async (file: AnimationFile) => {
    versions.current.push(versionText(file));
    refreshHistory();
    setState((s) => reducers.edited(s, file, false));
  }, [refreshHistory]);

  /** Undo/redo (091): the neighbour version becomes the edit version, played again by the stage. */
  const step = useCallback((text: string | null) => {
    if (text === null) return;
    setState((s) => reducers.edited(s, JSON.parse(text) as AnimationFile, true));
    refreshHistory();
  }, [refreshHistory]);

  const undo = useCallback(async () => step(versions.current.undo()), [step]);
  const redo = useCallback(async () => step(versions.current.redo()), [step]);

  const dirty = isDirty(state);

  const save = useCallback(async () => {
    const current = stateRef.current;
    if (!current.content || !isDirty(current)) return;
    const text = versionText(current.content);
    const parsed = parseAnimationText(text);
    if ('error' in parsed) {
      toast.error(t('editor.save.invalid', { message: parsed.error.message }));
      return;
    }
    setSaving(true);
    ownSaves.current.add(text);
    try {
      // 090: the library card's picture of the new content; a failed one is skipped (the card draws it live).
      let thumbnail: Blob | null = null;
      try {
        const { renderAnimationThumbnail } = await import('../components/library/animationThumbnail');
        thumbnail = await renderAnimationThumbnail(toRoll6Clip(parsed.file, `animation:${animationId}`));
      } catch {
        thumbnail = null;
      }
      await animationService.replaceContent(animationId, parsed.file, await uploadThumbnail(thumbnail, 'animation'));
      setState((s) => reducers.saved(s, current.content!));
      toast.success(t('editor.save.saved'));
    } catch (err) {
      ownSaves.current.delete(text);
      toast.error(t('editor.save.invalid', { message: err instanceof Error ? err.message : t('common.unknownError') }));
    } finally {
      setSaving(false);
    }
  }, [animationId, t]);

  const discard = useCallback(() => {
    const saved = stateRef.current.savedContent;
    if (saved) versions.current.push(versionText(saved));
    refreshHistory();
    setState((s) => reducers.discarded(s));
  }, [refreshHistory]);

  const errorToast = useCallback((err: unknown) => {
    const code: EditorErrorCode | null = err instanceof EditorHubError ? err.code : null;
    const key = code === 'busy' ? 'editor.error.busy' : code === 'no-agent' ? 'editor.error.noAgent' : code === 'invalid' ? 'editor.error.invalid' : null;
    toast.error(key ? t(key) : err instanceof Error ? err.message : t('common.unknownError'));
  }, [t]);

  const sendRequest = useCallback(async (text: string, modelName: string | null) => {
    const hub = connection.current;
    if (!hub || !state.animation) return;
    const attachments = state.attachments;
    try {
      const requestId = await animationEditorService.sendRequest(hub, {
        animationId,
        text,
        images: attachments.map((print) => ({ png: base64Of(print.marked), caption: print.caption })),
        modelName,
        // 091: the Claude works on the edit version, unsaved changes included.
        content: state.content,
      });
      ownRequests.current.add(requestId);
      setState((s) => reducers.sent(s, requestId, text, attachments.map((print) => print.marked), new Date().toISOString()));
    } catch (err) {
      errorToast(err);
    }
  }, [animationId, errorToast, state.animation, state.attachments, state.content]);

  const stopRequest = useCallback(async () => {
    const hub = connection.current;
    if (!hub || !state.request) return;
    try {
      await animationEditorService.stopRequest(hub, state.request.id);
    } catch (err) {
      errorToast(err);
    }
  }, [errorToast, state.request]);

  const newConversation = useCallback(async () => {
    const hub = connection.current;
    if (!hub) return;
    try {
      await animationEditorService.newConversation(hub, animationId);
    } catch (err) {
      errorToast(err);
    }
  }, [animationId, errorToast]);

  const attachPrint = useCallback((print: Omit<PrintAttachment, 'id'>): boolean => {
    if (state.attachments.length >= MAX_ATTACHMENTS) {
      toast.warning(t('editor.prints.max', { count: MAX_ATTACHMENTS }));
      return false;
    }
    setState((s) => reducers.attachPrint(s, { ...print, id: nextPrintId.current++ }));
    return true;
  }, [state.attachments.length, t]);

  const replacePrint = useCallback((print: PrintAttachment) => setState((s) => reducers.replacePrint(s, print)), []);
  const removePrint = useCallback((id: number) => setState((s) => reducers.removePrint(s, id)), []);

  const value = useMemo<AnimationEditorContextType>(() => ({
    state, loading, error, connected, history, tokenId, setToken, skeleton, setSkeleton, saveContent, undo, redo, dirty, saving,
    save, discard, sendRequest, stopRequest, newConversation, attachPrint, replacePrint, removePrint,
  }), [
    state, loading, error, connected, history, tokenId, setToken, skeleton, setSkeleton, saveContent, undo, redo, dirty, saving,
    save, discard, sendRequest, stopRequest, newConversation, attachPrint, replacePrint, removePrint,
  ]);

  return <AnimationEditorContext.Provider value={value}>{children}</AnimationEditorContext.Provider>;
};

export default AnimationEditorContext;
