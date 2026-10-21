import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useTurn } from '../../hooks/useTurn';
import { currentAction } from '../../lib/turnStatus';
import type { ActTarget } from '../../lib/turnStatus';
import { submitsOnEnter, targetTitle, toTargetWrite } from '../../lib/actionTarget';

/** Longest action text (backend Turn.MAX_DESCRIPTION). */
const MAX_ACTION = 2000;

interface ActModalProps {
  open: boolean;
  /** Piece acting (its character or NPC occurrence); with `target` it is an "Ação sobre…" (098). */
  piece: ActTarget | null;
  onClose: () => void;
}

/**
 * "Agir": the action's text, recorded in the current turn and shown in a balloon over the piece. When the piece already
 * acted in this turn the field opens with that text, so the player changes it instead of writing it again. "Ação
 * sobre…" (098) opens the same window titled after the picked hex or piece and sends it with the action. Enter sends,
 * Shift+Enter breaks the line.
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
    if (!piece || !text.trim() || saving) return;
    try {
      setSaving(true);
      await act({ mapTokenId: piece.mapTokenId }, text.trim(), null, {}, piece.target ? toTargetWrite(piece.target) : null);
      toast.success(t('toast.actionRecorded'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  // 098 (FR-008): Enter sends like the button; Shift+Enter is a new line; an empty field sends nothing (the submit guard).
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!submitsOnEnter(event.key, event.shiftKey, event.nativeEvent.isComposing)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const title = piece?.target
    ? t('turn.actOnTitle', { target: targetTitle(piece.target), name: piece.name })
    : t('turn.actTitle', { name: piece?.name ?? '' });

  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={title}
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
          placeholder={t('turn.actPlaceholder')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
        <div className="form-text text-end">{text.length}/{MAX_ACTION}</div>
      </form>
    </Modal>
  );
};

export default ActModal;
