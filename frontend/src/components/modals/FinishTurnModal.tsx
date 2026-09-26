import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';

interface FinishTurnModalProps {
  /** Characters that still have to act; the modal is open while there are any. */
  pending: string[];
  onBack: () => void;
  /** Finishes the turn anyway; the modal closes when it resolves. */
  onForce: () => Promise<void>;
}

/** "Finalizar turno" with characters that didn't act: lists them and lets the master go on anyway. */
export const FinishTurnModal = ({ pending, onBack, onForce }: FinishTurnModalProps) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const force = async () => {
    try {
      setBusy(true);
      await onForce();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={pending.length > 0}
      onOpenChange={(value) => { if (!value) onBack(); }}
      title={t('turn.pendingTitle')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onBack} disabled={busy}>{t('turn.back')}</button>
          <button type="button" className="btn btn-warning" onClick={() => { void force(); }} disabled={busy}>
            {t('turn.finishAnyway')}
          </button>
        </>
      )}
    >
      <p>{t('turn.pendingMessage')}</p>
      <ul className="mb-0">
        {pending.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </Modal>
  );
};

export default FinishTurnModal;
