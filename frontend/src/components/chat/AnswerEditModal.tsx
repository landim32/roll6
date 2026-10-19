import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { MAX_ANSWER } from '../../lib/askComposer';
import type { ChatItemInfo } from '../../types/chat';

interface AnswerEditModalProps {
  /** The answer being corrected; null = closed. */
  item: ChatItemInfo | null;
  onClose: () => void;
  onSave: (item: ChatItemInfo, text: string) => Promise<void>;
}

/** "Corrigir resposta" (093): the master rewrites what his Claude answered; the bubble then says it was corrected. */
export const AnswerEditModal = ({ item, onClose, onSave }: AnswerEditModalProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) setText(item.text ?? '');
  }, [item]);

  const value = text.trim();
  const save = async () => {
    if (!item || !value || busy) return;
    setBusy(true);
    try {
      await onSave(item, value);
      toast.success(t('chat.ask.editSaved'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={item !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }} title={t('chat.ask.editTitle')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={() => { void save(); }} disabled={busy || !value}>{t('common.save')}</button>
        </>
      )}>
      <label htmlFor="chat-answer-text" className="form-label">{t('chat.ask.editLabel')}</label>
      <textarea id="chat-answer-text" className="form-control" rows={8} value={text} maxLength={MAX_ANSWER}
        onChange={(e) => setText(e.target.value)} disabled={busy} />
      <div className="form-text text-end">{text.length}/{MAX_ANSWER}</div>
    </Modal>
  );
};

export default AnswerEditModal;
