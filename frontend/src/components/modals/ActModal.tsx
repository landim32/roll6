import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useTurn } from '../../hooks/useTurn';
import { currentAction } from '../../lib/turnStatus';
import type { ActTarget } from '../../lib/turnStatus';

/** Longest action text (backend Turn.MAX_DESCRIPTION). */
const MAX_ACTION = 2000;

interface ActModalProps {
  open: boolean;
  /** Piece acting (its character or NPC occurrence). */
  piece: ActTarget | null;
  onClose: () => void;
}

/**
 * "Agir": the action's text, recorded in the current turn and shown in a balloon over the piece. When the piece already
 * acted in this turn the field opens with that text, so the player changes it instead of writing it again.
 */
export const ActModal = ({ open, piece, onClose }: ActModalProps) => {
  const { t } = useTranslation();
  const { act, entries } = useTurn();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  // The turn is refreshed while the modal is open (polling, real time): the field is filled when it opens and never
  // rewritten under the player's hands, so the latest entries are read through a ref.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const pieceRef = useRef(piece);
  pieceRef.current = piece;
  const pieceId = piece?.mapTokenId ?? null;

  useEffect(() => {
    if (!open) return;
    const target = pieceRef.current;
    setText(target ? currentAction(entriesRef.current, target) : '');
  }, [open, pieceId]);

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
