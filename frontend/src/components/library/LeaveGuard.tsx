import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';

interface LeaveGuardProps {
  open: boolean;
  onDiscard: () => void;
  onStay: () => void;
}

/** "Descartar as alterações?" (087): shown by `useLeaveGuard` when a page with unsaved changes is being left. */
export const LeaveGuard = ({ open, onDiscard, onStay }: LeaveGuardProps) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onStay(); }}
      title={t('library.leave.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onStay}>{t('library.leave.stay')}</button>
          <button type="button" className="btn btn-danger" onClick={onDiscard}>{t('library.leave.discard')}</button>
        </>
      )}
    >
      <p className="mb-0">{t('library.leave.message')}</p>
    </Modal>
  );
};

export default LeaveGuard;
