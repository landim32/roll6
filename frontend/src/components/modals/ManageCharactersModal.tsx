import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { ManageCharactersPanel } from '../campaign/ManageCharactersPanel';

interface ManageCharactersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Master only: characters in the campaign (approve / deny / remove) and the invite search. */
export const ManageCharactersModal = ({ open, onOpenChange }: ManageCharactersModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('manage.title')} large>
      <ManageCharactersPanel active={open} />
    </Modal>
  );
};

export default ManageCharactersModal;
