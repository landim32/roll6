import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';

export type UnsavedChoice = 'save' | 'discard' | 'cancel';

interface UnsavedChangesModalProps {
  open: boolean;
  onChoose: (choice: UnsavedChoice) => void;
}

/** Save / Discard / Cancel before replacing a map with unsaved changes. */
export const UnsavedChangesModal = ({ open, onChoose }: UnsavedChangesModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={(value) => { if (!value) onChoose('cancel'); }}
      title={t('unsaved.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onChoose('cancel')}>{t('unsaved.cancel')}</button>
          <button type="button" className="btn btn-outline-danger" onClick={() => onChoose('discard')}>{t('unsaved.discard')}</button>
          <button type="button" className="btn btn-primary" onClick={() => onChoose('save')}>{t('unsaved.save')}</button>
        </>
      )}
    >
      <p className="mb-0">{t('unsaved.message')}</p>
    </Modal>
  );
};

export default UnsavedChangesModal;
