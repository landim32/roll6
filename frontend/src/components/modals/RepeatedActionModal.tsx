import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useTurn } from '../../hooks/useTurn';
import { submitsOnEnter } from '../../lib/actionTarget';
import { MAX_REPEATED, resultToastKey } from '../../lib/repeatedAction';
import type { ActTarget } from '../../lib/turnStatus';

/** The piece whose repeated action is edited, with the text active now (null = none). */
export interface RepeatedTarget extends ActTarget {
  current: string | null;
}

interface RepeatedActionModalProps {
  piece: RepeatedTarget | null;
  onClose: () => void;
}

/**
 * "Ação repetida…" (099): explains how a standing order works ("para um melhor resultado, descreva bem", with the axe
 * example), takes its text (Enter sends, Shift+Enter breaks the line) and, while one is active, offers "Remover ação
 * repetida".
 */
export const RepeatedActionModal = ({ piece, onClose }: RepeatedActionModalProps) => {
  const { t } = useTranslation();
  const { setRepeated } = useTurn();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const active = piece?.current ?? null;
  const pieceId = piece?.mapTokenId ?? null;

  // The field opens with the active repetition (or empty) each time the window opens for a piece.
  useEffect(() => {
    setText(active ?? '');
  }, [pieceId, active]);

  const save = async (description: string | null) => {
    if (!piece || saving) return;
    try {
      setSaving(true);
      const result = await setRepeated({ mapTokenId: piece.mapTokenId }, description);
      toast.success(t(resultToastKey(result)));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    void save(text.trim());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!submitsOnEnter(event.key, event.shiftKey, event.nativeEvent.isComposing)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <Modal
      open={piece !== null}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t('repeated.title', { name: piece?.name ?? '' })}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          {active && (
            <button type="button" className="btn btn-outline-danger" onClick={() => { void save(null); }} disabled={saving}>
              {t('repeated.remove')}
            </button>
          )}
          <button type="submit" form="repeated-form" className="btn btn-primary" disabled={saving || !text.trim()}>
            {saving ? t('common.loading') : t('repeated.save')}
          </button>
        </>
      )}
    >
      <form id="repeated-form" onSubmit={submit}>
        <p className="small mb-2">{t('repeated.explain')}</p>
        <p className="small text-body-secondary fst-italic">{t('repeated.example')}</p>
        <label className="form-label visually-hidden" htmlFor="repeated-text">{t('repeated.label')}</label>
        <textarea id="repeated-text" className="form-control" rows={4} maxLength={MAX_REPEATED} required autoFocus
          placeholder={t('repeated.placeholder')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
        <div className="form-text text-end">{text.length}/{MAX_REPEATED}</div>
      </form>
    </Modal>
  );
};

export default RepeatedActionModal;
