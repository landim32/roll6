import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  /** Runs on confirm; the modal closes when it resolves and stays open when it throws. */
  onConfirm: () => Promise<void> | void;
  danger?: boolean;
}

/** Generic yes/no confirmation opened on top of another modal. */
export const ConfirmModal = ({ open, onOpenChange, title, message, confirmLabel, onConfirm, danger = false }: ConfirmModalProps) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller shows the error; keep the dialog open.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={busy}>{t('common.cancel')}</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={busy}>{confirmLabel}</button>
        </>
      )}
    >
      <p className="mb-0">{message}</p>
    </Modal>
  );
};

export default ConfirmModal;
