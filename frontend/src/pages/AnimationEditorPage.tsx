import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AnimationEditorProvider } from '../Contexts/AnimationEditorContext';
import { useAnimationEditor } from '../hooks/useAnimationEditor';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { APP_NAME } from '../lib/documentTitle';
import { animationEditorPath, idParam, libraryPath } from '../lib/libraryRoutes';
import { isBusy } from '../lib/editorState';
import type { PrintAttachment } from '../lib/editorState';
import { caption } from '../lib/printCaption';
import type { Mark } from '../lib/markup';
import { clampZoom } from '../lib/previewZoom';
import { hasWeapons, readWeaponsToggle, weaponItems, writeWeaponsToggle } from '../lib/editorWeapons';
import { socketWeaponsOf } from '../lib/weaponGrip';
import type { AnimationFile } from '../lib/animationFormat';
import type { TokenInfo } from '../types/token';
import { AnimationTimeline } from '../components/animations/editor/AnimationTimeline';
import type { TimelineHandle } from '../components/animations/editor/AnimationTimeline';
import { EditorConversation } from '../components/animations/editor/EditorConversation';
import { EditorTopBar } from '../components/animations/editor/EditorTopBar';
import { PrintMarkupModal } from '../components/animations/editor/PrintMarkupModal';
import type { MarkupResult } from '../components/animations/editor/PrintMarkupModal';
import type { CapturedPrint, StageHandle, StageStatus } from '../components/animations/editor/AnimationStage';
import { ZoomButtons } from '../components/ui/ZoomButtons';
import { ArrowClockwiseIcon, ArrowCounterclockwiseIcon } from '../components/ui/icons';

const AnimationStage = lazy(() => import('../components/animations/editor/AnimationStage'));

/** Longest side of a print sent to the Claude. */
const PRINT_MAX_SIDE = 1024;

/**
 * `/library/animations/:id/editor` (089; was `/animation/:id` in its own tab, 086): the animation editor inside the
 * library — its bar (back to the animation, name, agent, model), the stage with the chosen token playing the
 * animation, the time bar, the pose editor and the conversation with the local Claude.
 */
export const AnimationEditorPage = () => {
  const { id } = useParams();
  const animationId = Number(id);
  if (!Number.isInteger(animationId) || animationId <= 0) return <NotAvailable kind="not-found" />;
  return (
    <AnimationEditorProvider animationId={animationId}>
      <EditorBody />
    </AnimationEditorProvider>
  );
};

/** The old address `/animation/:id` (086) goes to the editor in the library (089). */
export const AnimationEditorRedirect = () => {
  const { id } = useParams();
  const animationId = idParam(id);
  return <Navigate to={animationId === null ? libraryPath('animations') : animationEditorPath(animationId)} replace />;
};

const NotAvailable = ({ kind }: { kind: 'forbidden' | 'not-found' | 'offline' }) => {
  const { t } = useTranslation();
  return (
    <div className="stm-editor-page">
      <div className="stm-editor-empty card p-4 m-auto text-center">
        <p className="mb-3">{t(kind === 'forbidden' ? 'editor.forbidden' : kind === 'offline' ? 'editor.offlineLong' : 'editor.notFound')}</p>
        <Link to={libraryPath('animations')} className="btn btn-primary">{t('editor.backToList')}</Link>
      </div>
    </div>
  );
};

const EditorBody = () => {
  const { t } = useTranslation();
  const editor = useAnimationEditor();
  const { state, loading, error, tokenId, skeleton, setSkeleton, history, undo, redo, saveContent, attachPrint, replacePrint, dirty, save } = editor;
  // 091: unsaved changes live only in this tab — leaving asks first.
  const guard = useLeaveGuard(dirty);
  const stage = useRef<StageHandle | null>(null);
  const timeline = useRef<TimelineHandle | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [mixamo, setMixamo] = useState<boolean | null>(null);
  const [status, setStatus] = useState<StageStatus>({ text: null, error: false });
  const [zoom, setZoom] = useState(1);
  const [markup, setMarkup] = useState<{ print: CapturedPrint; original: string; existing: PrintAttachment | null } | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const listener = (event: MediaQueryListEvent) => setDesktop(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const token = useMemo(() => tokens.find((item) => item.tokenId === tokenId) ?? null, [tokens, tokenId]);
  const modelUrl = token?.modelFileUrl ?? null;
  // 092: the token's weapons on the stage, the "Armas" toggle and their names for the print and the Claude.
  const [showWeapons, setShowWeaponsState] = useState(readWeaponsToggle);
  const setShowWeapons = (on: boolean) => { setShowWeaponsState(on); writeWeaponsToggle(on); };
  const stageWeapons = useMemo(() => (token ? socketWeaponsOf(token) : undefined), [token]);
  const armed = hasWeapons(token);
  const visibleWeapons = useMemo(() => (showWeapons ? weaponItems(token) : []), [showWeapons, token]);
  const busy = isBusy(state);

  useEffect(() => {
    document.title = state.animation ? `${state.animation.name} · ${t('editor.title')} | ${APP_NAME}` : `${t('editor.title')} | ${APP_NAME}`;
  }, [state.animation, t]);

  const editingReason = busy ? t('editor.edit.blockedRunning') : mixamo === false ? t('editor.edit.notMixamo') : null;
  const editingAllowed = !busy && mixamo === true && !!state.content;

  const onSave = useCallback(async (file: AnimationFile) => {
    try {
      await saveContent(file);
      setStatus({ text: t('editor.edit.pending'), error: false });
    } catch (err) {
      setStatus({ text: t('editor.edit.notSaved', { message: err instanceof Error ? err.message : t('common.unknownError') }), error: true });
    }
  }, [saveContent, t]);

  // Ctrl+Z / Ctrl+Y on the page (not inside a text field) walk the versions.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return;
      if (markup) return;
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === 's') {
        // 091: Ctrl+S saves the edit version.
        event.preventDefault();
        if (dirty) void save();
      } else if (event.ctrlKey && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        if (editingAllowed) void redo();
      } else if (event.ctrlKey && key === 'z') {
        event.preventDefault();
        if (editingAllowed) void undo();
      } else if (event.key === 'Escape') {
        stage.current?.deselect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, editingAllowed, markup, redo, save, undo]);

  const capture = useCallback(() => {
    const print = stage.current?.capture();
    if (!print) {
      toast.error(t('editor.prints.noModel'));
      return;
    }
    setMarkup({ print, original: print.png, existing: null });
  }, [t]);

  const markupDone = useCallback(async (result: MarkupResult) => {
    if (!markup) return;
    const text = caption({
      animationName: state.animation?.name ?? null,
      time: markup.print.time,
      duration: markup.print.duration,
      paused: markup.print.paused,
      azimuth: markup.print.azimuth,
      elevation: markup.print.elevation,
      skeleton: markup.print.skeleton,
      pose: markup.print.pose,
      marks: result.marks,
      weapons: visibleWeapons,
    });
    const marked = await downscale(result.marked, PRINT_MAX_SIDE);
    if (markup.existing) replacePrint({ ...markup.existing, marked, marks: result.marks, caption: text });
    else attachPrint({ original: markup.original, marked, marks: result.marks, caption: text });
    setMarkup(null);
  }, [attachPrint, markup, replacePrint, state.animation?.name, visibleWeapons]);

  const editPrint = useCallback((print: PrintAttachment) => {
    // The caption of a stored print keeps its capture; only the marks are redone.
    setMarkup({ print: { png: print.original, time: null, duration: null, paused: true, azimuth: 0, elevation: 0, skeleton: false, pose: null }, original: print.original, existing: print });
  }, []);

  if (error) return <NotAvailable kind={error} />;

  return (
    <div className="stm-editor-page">
      <EditorTopBar onTokens={setTokens} />
      {loading && <p className="text-body-secondary p-3">{t('common.loading')}</p>}
      {!loading && (
        <div className="stm-editor-layout">
          <div className="stm-editor-left">
            <div className="stm-editor-stage-wrap">
              {modelUrl ? (
                <Suspense fallback={<div className="stm-editor-stage text-body-secondary p-3">{t('editor.stage.loading')}</div>}>
                  <AnimationStage ref={stage} modelUrl={modelUrl} content={state.content} contentVersion={state.contentVersion}
                    animationName={state.animation?.name ?? ''} skeleton={skeleton && desktop} editingAllowed={editingAllowed && desktop}
                    weapons={stageWeapons} showWeapons={showWeapons} idleClip={token?.modelIdleClip ?? null}
                    editingReason={editingReason} zoom={zoom}
                    onModelLoaded={(info) => setMixamo(info.mixamo)}
                    onModelError={() => { setMixamo(null); toast.error(t('editor.stage.modelError')); }}
                    onAnimationError={(message) => toast.error(message)}
                    onFrame={(playback, pose) => timeline.current?.refresh(playback, pose)}
                    onSave={(file) => { void onSave(file); }}
                    onStatus={setStatus}
                    labels={{
                      dragHint: t('editor.edit.drag'), saving: t('editor.edit.saving'), notMixamo: t('editor.edit.notMixamo'),
                      notEditable: t('editor.edit.notEditable'), blocked: t('editor.edit.blocked'), noAnimation: t('editor.edit.noAnimation'),
                    }} />
                </Suspense>
              ) : (
                <div className="stm-editor-stage stm-editor-stage-empty">
                  <p className="text-body-secondary m-auto p-3 text-center">{t(tokens.length === 0 ? 'editor.model.noneHint' : 'editor.model.chooseHint')}</p>
                </div>
              )}
              {modelUrl && <ZoomButtons zoom={zoom} onChange={(value) => setZoom(clampZoom(value))} />}
              {modelUrl && desktop && (
                <div className="stm-editor-tools btn-group btn-group-sm" role="group">
                  <button type="button" className={`btn ${skeleton ? 'btn-primary' : 'btn-outline-secondary'}`} aria-pressed={skeleton}
                    onClick={() => setSkeleton(!skeleton)} title={t(skeleton ? 'editor.skeleton.hide' : 'editor.skeleton.show')}>
                    {t('editor.skeleton.label')}
                  </button>
                  <button type="button" className={`btn ${armed && showWeapons ? 'btn-primary' : 'btn-outline-secondary'}`}
                    aria-pressed={armed && showWeapons} disabled={!armed} onClick={() => setShowWeapons(!showWeapons)}
                    title={t(!armed ? 'editor.weapons.none' : showWeapons ? 'editor.weapons.hide' : 'editor.weapons.show')}>
                    {t('editor.weapons.label')}
                  </button>
                  <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" disabled={!editingAllowed || history.undo === 0}
                    onClick={() => { void undo(); }} title={t('editor.edit.undo')} aria-label={t('editor.edit.undo')}>
                    <ArrowCounterclockwiseIcon size={14} />{history.undo}
                  </button>
                  <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" disabled={!editingAllowed || history.redo === 0}
                    onClick={() => { void redo(); }} title={t('editor.edit.redo')} aria-label={t('editor.edit.redo')}>
                    <ArrowClockwiseIcon size={14} />{history.redo}
                  </button>
                </div>
              )}
              {status.text && <div className={`stm-editor-status${status.error ? ' is-error' : ''}`}>{status.text}</div>}
            </div>
            <AnimationTimeline handle={timeline}
              onPlay={() => stage.current?.play()} onPause={() => stage.current?.pause()} onSeek={(seconds) => stage.current?.seek(seconds)} />
          </div>
          <EditorConversation modelName={token?.name ?? null} modelWeapons={visibleWeapons} onAttach={modelUrl && desktop ? capture : null} onEditPrint={editPrint} />
        </div>
      )}
      <PrintMarkupModal original={markup?.original ?? null} initialMarks={(markup?.existing?.marks as Mark[] | undefined) ?? []}
        onDone={(result) => { void markupDone(result); }} onCancel={() => setMarkup(null)} />
      {guard}
    </div>
  );
};

/** A PNG data URL with its longest side at most `max` pixels (the prints go to the Claude as base64). */
const downscale = (dataUrl: string, max: number): Promise<string> => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale >= 1) {
      resolve(dataUrl);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

export default AnimationEditorPage;
