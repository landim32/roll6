import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '../ui/icons';
import { useChat } from '../../hooks/useChat';
import {
  cleanOptions, isPollDirty, moveOption, POLL_LIMITS, removeOption, validatePoll, withTrailingEmpty,
} from '../../lib/chatPoll';
import type { PollErrors } from '../../lib/chatPoll';

interface PollComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const optionError = (error: PollErrors['options']): string | null => {
  switch (error) {
    case 'tooFew': return 'chat.poll.errors.tooFew';
    case 'tooMany': return 'chat.poll.errors.tooMany';
    case 'tooLong': return 'chat.poll.errors.optionTooLong';
    case 'repeated': return 'chat.poll.errors.repeated';
    default: return null;
  }
};

/**
 * "Nova enquete" (045), like WhatsApp's: a question and a list of options that grows by one empty row as the last one
 * gets text (up to 12), each row with up / down / remove. Closing with something typed asks before discarding.
 */
export const PollComposerModal = ({ open, onOpenChange }: PollComposerModalProps) => {
  const { t } = useTranslation();
  const { createPoll } = useChat();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(() => withTrailingEmpty([]));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuestion('');
    setOptions(withTrailingEmpty([]));
    setTouched(false);
    setBusy(false);
  }, [open]);

  const errors = validatePoll(question, options);
  const valid = Object.keys(errors).length === 0;
  const showQuestionError = touched && errors.question;
  // "Too few" only after the user tried to send; a repeated or long option shows at once.
  const optionKey = optionError(errors.options);
  const showOptionError = optionKey && (touched || errors.options === 'repeated' || errors.options === 'tooLong');

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (busy) return;
    if (isPollDirty(question, options)) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  const setOption = (index: number, value: string) =>
    setOptions((rows) => withTrailingEmpty(rows.map((row, i) => (i === index ? value : row))));

  const submit = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    try {
      await createPoll(question.trim(), cleanOptions(options));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const filled = cleanOptions(options).length;

  return (
    <>
      <Modal open={open} onOpenChange={requestClose} title={t('chat.poll.title')}
        footer={(
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => requestClose(false)} disabled={busy}>
              {t('chat.poll.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { void submit(); }} disabled={busy || (touched && !valid)}>
              {t('chat.poll.send')}
            </button>
          </>
        )}>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label className="form-label" htmlFor="stm-poll-question">{t('chat.poll.question')}</label>
          <textarea id="stm-poll-question" className={`form-control${showQuestionError ? ' is-invalid' : ''}`} rows={2}
            maxLength={POLL_LIMITS.question} value={question} placeholder={t('chat.poll.questionPlaceholder')}
            onChange={(e) => setQuestion(e.target.value)} autoFocus />
          <div className="d-flex justify-content-between">
            <small className="text-danger">
              {showQuestionError && t(errors.question === 'tooLong' ? 'chat.poll.errors.questionTooLong' : 'chat.poll.errors.required',
                { max: POLL_LIMITS.question })}
            </small>
            <small className="text-body-secondary">{question.trim().length}/{POLL_LIMITS.question}</small>
          </div>

          <div className="d-flex justify-content-between align-items-baseline mt-3 mb-1">
            <span className="form-label mb-0">{t('chat.poll.options')}</span>
            <small className="text-body-secondary">{filled}/{POLL_LIMITS.maxOptions}</small>
          </div>
          {options.map((value, index) => {
            const last = index === options.length - 1;
            return (
              <div key={index} className="stm-poll-editor-row">
                <input type="text" className="form-control" value={value} maxLength={POLL_LIMITS.option}
                  placeholder={t('chat.poll.optionPlaceholder', { n: index + 1 })}
                  aria-label={t('chat.poll.optionPlaceholder', { n: index + 1 })}
                  onChange={(e) => setOption(index, e.target.value)} />
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={index === 0 || last}
                  onClick={() => setOptions((rows) => moveOption(rows, index, -1))}
                  title={t('chat.poll.moveUp')} aria-label={t('chat.poll.moveUp')}>
                  <ChevronUpIcon />
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={last || index >= options.length - 2}
                  onClick={() => setOptions((rows) => moveOption(rows, index, 1))}
                  title={t('chat.poll.moveDown')} aria-label={t('chat.poll.moveDown')}>
                  <ChevronDownIcon />
                </button>
                <button type="button" className="btn btn-outline-danger btn-sm" disabled={last && value === ''}
                  onClick={() => setOptions((rows) => removeOption(rows, index))}
                  title={t('chat.poll.removeOption')} aria-label={t('chat.poll.removeOption')}>
                  <TrashIcon />
                </button>
              </div>
            );
          })}
          <small className={showOptionError ? 'text-danger' : 'text-body-secondary'}>
            {showOptionError ? t(optionKey, { max: POLL_LIMITS.option }) : t('chat.poll.addHint', { max: POLL_LIMITS.maxOptions })}
          </small>
        </form>
      </Modal>
      <ConfirmModal
        open={confirmDiscard}
        onOpenChange={(o) => { if (!o) setConfirmDiscard(false); }}
        title={t('chat.poll.discardTitle')}
        message={t('chat.poll.discardMessage')}
        confirmLabel={t('chat.poll.discard')}
        onConfirm={() => { setConfirmDiscard(false); onOpenChange(false); }}
        danger
      />
    </>
  );
};

export default PollComposerModal;
