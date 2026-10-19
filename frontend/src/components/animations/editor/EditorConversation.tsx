import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isAtBottom } from '../../../lib/stickToBottom';
import { useAnimationEditor } from '../../../hooks/useAnimationEditor';
import { isBusy } from '../../../lib/editorState';
import type { EditorMessage, PrintAttachment } from '../../../lib/editorState';
import { CONVERSATION_ROLE, REQUEST_STATE } from '../../../types/animationEditor';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { ImageLightbox } from '../../chat/ImageLightbox';
import { CameraIcon, SendIcon, StopIcon, XIcon } from '../../ui/icons';

const MarkdownView = lazy(() => import('../../ui/MarkdownView'));

const MAX_TEXT = 4000;

interface EditorConversationProps {
  /** The name of the token on the stage, for the Claude's context. */
  modelName: string | null;
  /** The weapons it carries on the stage (092), for the Claude's context. */
  modelWeapons?: string[];
  /** "Anexar print" (null on phones or without a model): captures and opens the markup. */
  onAttach: (() => void) | null;
  /** A thumbnail was tapped: reopen the markup of that print. */
  onEditPrint: (print: PrintAttachment) => void;
}

/**
 * The conversation with the local Claude (086): the stored lines (user with the thumbnails of this tab, Claude as
 * markdown once finished and as live text while it arrives, notices muted), the state of the request, the composer with
 * the attached prints, "Enviar", "Parar" and "Nova conversa".
 */
export const EditorConversation = ({ modelName, modelWeapons = [], onAttach, onEditPrint }: EditorConversationProps) => {
  const { t } = useTranslation();
  const { state, connected, sendRequest, stopRequest, newConversation, removePrint } = useAnimationEditor();
  const [text, setText] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const busy = isBusy(state);
  const canSend = connected && state.agent.connected && !busy && (text.trim().length > 0 || state.attachments.length > 0) && text.length <= MAX_TEXT;

  // 091: follow the newest content — growing Claude text, tool lines, notices, markdown and thumbnails that render
  // late — while the user is at the bottom; leave them alone once they scroll up to read.
  const atBottom = useRef(true);
  useEffect(() => {
    const element = list.current;
    if (!element) return undefined;
    const stick = () => { if (atBottom.current) element.scrollTop = element.scrollHeight; };
    const onScroll = () => { atBottom.current = isAtBottom(element); };
    const observer = new MutationObserver(stick);
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    element.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('load', stick, true);
    stick();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', onScroll);
      element.removeEventListener('load', stick, true);
    };
  }, []);

  const send = async () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    // An own message always goes to the bottom, even when the user was reading above.
    atBottom.current = true;
    await sendRequest(value, modelName, modelWeapons);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const placeholder = !state.agent.connected
    ? t('editor.agent.hint')
    : busy
      ? t('editor.conversation.waitRunning')
      : t('editor.conversation.placeholder');

  return (
    <section className="stm-editor-conversation" aria-label={t('editor.conversation.title')}>
      <div ref={list} className="stm-editor-messages">
        {state.messages.length === 0 && <p className="text-body-secondary small m-2">{t('editor.conversation.empty')}</p>}
        {state.messages.map((message) => <MessageLine key={message.key} message={message} />)}
        {state.request?.state === REQUEST_STATE.queued && (
          <p className="stm-editor-notice">
            {state.request.position
              ? t('editor.conversation.queued', { position: state.request.position })
              : t('editor.conversation.sending')}
          </p>
        )}
        {state.request?.state === REQUEST_STATE.running && (
          <p className="stm-editor-notice">{t('editor.conversation.running', { machine: state.request.machine ?? '…' })}</p>
        )}
      </div>

      {state.attachments.length > 0 && (
        <div className="stm-editor-attachments">
          {state.attachments.map((print) => (
            <span key={print.id} className="stm-editor-thumb">
              <button type="button" className="stm-editor-thumb-open" onClick={() => onEditPrint(print)}
                title={t('editor.prints.edit')} aria-label={t('editor.prints.edit')}>
                <img src={print.marked} alt="" />
              </button>
              <button type="button" className="btn btn-sm btn-dark stm-editor-thumb-remove" onClick={() => removePrint(print.id)}
                title={t('editor.prints.remove')} aria-label={t('editor.prints.remove')}>
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="stm-editor-composer">
        <textarea className="form-control" rows={3} value={text} maxLength={MAX_TEXT + 1} placeholder={placeholder}
          disabled={!connected || !state.agent.connected || busy} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown}
          aria-label={t('editor.conversation.placeholder')} />
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {onAttach && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onAttach} disabled={busy}
              title={t('editor.prints.attach')} aria-label={t('editor.prints.attach')}>
              <CameraIcon size={14} />
            </button>
          )}
          {text.length > MAX_TEXT && <small className="text-danger">{t('editor.conversation.tooLong', { max: MAX_TEXT })}</small>}
          <span className="flex-grow-1" />
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmNew(true)}
            disabled={busy || state.messages.length === 0}>
            {t('editor.conversation.newConversation')}
          </button>
          {busy ? (
            <button type="button" className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1" onClick={() => { void stopRequest(); }}>
              <StopIcon size={14} />{t('editor.conversation.stop')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1" onClick={() => { void send(); }} disabled={!canSend}>
              <SendIcon size={14} />{t('editor.conversation.send')}
            </button>
          )}
        </div>
      </div>

      <ConfirmModal open={confirmNew} onOpenChange={setConfirmNew} title={t('editor.conversation.newConversation')}
        message={t('editor.conversation.confirmNew')} confirmLabel={t('editor.conversation.newConversation')}
        onConfirm={newConversation} />
    </section>
  );
};

const MessageLine = ({ message }: { message: EditorMessage }) => {
  const { t } = useTranslation();
  if (message.role === CONVERSATION_ROLE.notice) {
    return <p className="stm-editor-notice">{message.text}</p>;
  }
  if (message.role === CONVERSATION_ROLE.user) {
    return (
      <div className="stm-editor-msg is-user">
        <div className="stm-editor-msg-text">{message.text}</div>
        {message.thumbnails.length > 0 && (
          <div className="stm-editor-msg-thumbs">
            {message.thumbnails.map((thumb, index) => <img key={index} src={thumb} alt={t('editor.prints.print', { index: index + 1 })} />)}
          </div>
        )}
        {message.thumbnails.length === 0 && message.imageCount > 0 && (
          <small className="text-body-secondary">{t('editor.prints.count', { count: message.imageCount })}</small>
        )}
      </div>
    );
  }
  return (
    <div className={`stm-editor-msg is-claude${message.running ? ' is-running' : ''}`}>
      {message.running || !message.text ? (
        <div className="stm-editor-msg-text">{message.text || (message.lines.length === 0 ? t('editor.conversation.thinking') : '')}</div>
      ) : (
        <Suspense fallback={<div className="stm-editor-msg-text">{message.text}</div>}>
          <MarkdownView value={message.text} />
        </Suspense>
      )}
      {message.lines.length > 0 && (
        <ul className="stm-editor-msg-lines">
          {message.lines.map((line, index) => <li key={index}>{line}</li>)}
        </ul>
      )}
      {message.prints.length > 0 && <AgentPrints message={message} />}
    </div>
  );
};

/** 094: the prints this tab took for the Claude, under its line; a tap opens one in the photo viewer. */
const AgentPrints = ({ message }: { message: EditorMessage }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<{ url: string; caption: string | null } | null>(null);
  return (
    <div className="stm-editor-agent-prints">
      {message.prints.map((print) => (
        <div key={print.callId} className="stm-editor-agent-print">
          <small className="text-body-secondary">
            {print.error ? t('editor.print.failed', { reason: print.error }) : t('editor.print.label', { count: print.shots.length })}
          </small>
          {print.shots.length > 0 && (
            <div className="stm-editor-msg-thumbs">
              {print.shots.map((shot, index) => {
                const url = `data:image/png;base64,${shot.png}`;
                return (
                  <button key={index} type="button" className="stm-editor-agent-thumb" onClick={() => setOpen({ url, caption: shot.caption })}
                    title={shot.caption} aria-label={t('editor.print.open', { index: index + 1 })}>
                    <img src={url} alt="" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <ImageLightbox image={open} onClose={() => setOpen(null)} />
    </div>
  );
};

export default EditorConversation;
