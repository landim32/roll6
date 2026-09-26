import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useTurn } from '../../hooks/useTurn';

/** Longest action text (backend Turn.MAX_DESCRIPTION). */
const MAX_ACTION = 2000;

interface ActModalProps {
  open: boolean;
  /** Piece acting (its character or NPC occurrence). */
  piece: { mapTokenId: number; name: string } | null;
  onClose: () => void;
}

/** "Agir": the action's text, recorded in the current turn and shown in a balloon over the piece. */
export const ActModal = ({ open, piece, onClose }: ActModalProps) => {
  const { t } = useTranslation();
  const { act } = useTurn();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setText('');
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!piece || !text.trim()) return;
    try {
      setSaving(true);
      await act(piece.mapTokenId, text.trim());
      toast.success(t('toast.actionRecorded'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t('turn.actTitle', { name: piece?.name ?? '' })}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" form="act-form" className="btn btn-primary" disabled={saving || !text.trim()}>
            {saving ? t('common.loading') : t('turn.act')}
          </button>
        </>
      )}
    >
      <form id="act-form" onSubmit={(event) => { void submit(event); }}>
        <label className="form-label visually-hidden" htmlFor="act-text">{t('turn.actLabel')}</label>
        <textarea id="act-text" className="form-control" rows={4} maxLength={MAX_ACTION} required autoFocus
          placeholder={t('turn.actPlaceholder')} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="form-text text-end">{text.length}/{MAX_ACTION}</div>
      </form>
    </Modal>
  );
};

export default ActModal;
