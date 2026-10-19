import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapGenerator } from '../../hooks/useMapGenerator';
import { isAtBottom } from '../../lib/stickToBottom';
import { isBusy } from '../../lib/mapGeneratorState';
import type { GeneratorAttachment, GeneratorMessage } from '../../lib/mapGeneratorState';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SendIcon, StopIcon, XIcon } from '../ui/icons';

const MarkdownView = lazy(() => import('../ui/MarkdownView'));

const MAX_TEXT = 4000;

interface GeneratorConversationProps {
  /** A thumbnail of a marked version was tapped: reopen its markup. */
  onEditAttachment: (attachment: GeneratorAttachment) => void;
}

/**
 * The conversation with the Codex of the user's console (095), like the animation editor's: the lines of this tab
 * (user with its marked thumbnails, the Codex as markdown with its tool lines, notices), the state of the request, the
 * composer with the attached marks, "Enviar", "Parar" and "Nova conversa". The fixed hint reminds that the camera is
 * not the user's to choose: every map comes out seen from above.
 */
export const GeneratorConversation = ({ onEditAttachment }: GeneratorConversationProps) => {
  const { t } = useTranslation();
  const { state, connected, sendRequest, stopRequest, newConversation, removeAttachment } = useMapGenerator();
  const [text, setText] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const busy = isBusy(state);
  const canSend = connected && state.agent.connected && !!state.sessionId && !busy
    && (text.trim().length > 0 || state.attachments.length > 0) && text.length <= MAX_TEXT;

  useEffect(() => {
    const element = list.current;
    if (!element) return undefined;
    const stick = () => { if (atBottom.current) element.scrollTop = element.scrollHeight; };
    const onScroll = () => { atBottom.current = isAtBottom(element); };
    const observer = new MutationObserver(stick);
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    element.addEventListener('scroll', onScroll, { passive: true });
    stick();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', onScroll);
    };
  }, []);

  const send = async () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    atBottom.current = true;
    await sendRequest(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const placeholder = !state.agent.connected ? t('mapGenerator.agentHint') : busy ? t('mapGenerator.waitRunning') : t('mapGenerator.placeholder');

  return (
    <section className="stm-generator-conversation" aria-label={t('mapGenerator.conversation')}>
      <div ref={list} className="stm-editor-messages">
        {state.messages.length === 0 && <p className="text-body-secondary small m-2">{t('mapGenerator.empty')}</p>}
        {state.messages.map((message) => <MessageLine key={message.key} message={message} />)}
        {state.request?.state === 'queued' && (
          <p className="stm-editor-notice">
            {state.request.position ? t('mapGenerator.queued', { position: state.request.position }) : t('mapGenerator.sending')}
          </p>
        )}
        {state.request?.state === 'running' && <p className="stm-editor-notice">{t('mapGenerator.running')}</p>}
      </div>

      {state.attachments.length > 0 && (
        <div className="stm-editor-attachments">
          {state.attachments.map((attachment) => (
            <span key={attachment.id} className="stm-editor-thumb">
              <button type="button" className="stm-editor-thumb-open" onClick={() => onEditAttachment(attachment)}
                title={t('mapGenerator.marks.edit')} aria-label={t('mapGenerator.marks.edit')}>
                <img src={attachment.marked} alt="" />
              </button>
              <button type="button" className="btn btn-sm btn-dark stm-editor-thumb-remove" onClick={() => removeAttachment(attachment.id)}
                title={t('mapGenerator.marks.remove')} aria-label={t('mapGenerator.marks.remove')}>
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="stm-editor-composer">
        <p className="stm-generator-hint small mb-1">{t('mapGenerator.topDownHint')}</p>
        <textarea className="form-control" rows={3} value={text} maxLength={MAX_TEXT + 1} placeholder={placeholder}
          disabled={!connected || !state.agent.connected || busy} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown}
          aria-label={t('mapGenerator.placeholder')} />
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {text.length > MAX_TEXT && <small className="text-danger">{t('mapGenerator.tooLong', { max: MAX_TEXT })}</small>}
          <span className="flex-grow-1" />
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setConfirmNew(true)}
            disabled={busy || state.messages.length === 0}>
            {t('mapGenerator.newConversation')}
          </button>
          {busy ? (
            <button type="button" className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1" onClick={() => { void stopRequest(); }}>
              <StopIcon size={14} />{t('mapGenerator.stop')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1" onClick={() => { void send(); }} disabled={!canSend}>
              <SendIcon size={14} />{t('mapGenerator.send')}
            </button>
          )}
        </div>
      </div>

      <ConfirmModal open={confirmNew} onOpenChange={setConfirmNew} title={t('mapGenerator.newConversation')}
        message={t('mapGenerator.confirmNew')} confirmLabel={t('mapGenerator.newConversation')} onConfirm={newConversation} />
    </section>
  );
};

const MessageLine = ({ message }: { message: GeneratorMessage }) => {
  const { t } = useTranslation();
  if (message.role === 'notice') return <p className="stm-editor-notice">{message.text}</p>;
  if (message.role === 'user') {
    return (
      <div className="stm-editor-msg is-user">
        <div className="stm-editor-msg-text">{message.text}</div>
        {message.thumbnails.length > 0 && (
          <div className="stm-editor-msg-thumbs">
            {message.thumbnails.map((thumb, index) => <img key={index} src={thumb} alt={t('mapGenerator.marks.print', { index: index + 1 })} />)}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`stm-editor-msg is-claude${message.running ? ' is-running' : ''}`}>
      {message.running || !message.text ? (
        <div className="stm-editor-msg-text">{message.text || (message.lines.length === 0 ? t('mapGenerator.thinking') : '')}</div>
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
    </div>
  );
};

export default GeneratorConversation;
