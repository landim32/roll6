import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { TurnHistoryList } from '../turns/TurnHistoryList';
import type { TurnHistoryState } from '../../hooks/useTurnHistory';

interface TurnConsoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The console's history: same pages and live updates, nothing reloaded. */
  history: TurnHistoryState;
}

/** The turn console in a full-screen window (028), with the normal font size. */
export const TurnConsoleModal = ({ open, onOpenChange, history }: TurnConsoleModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('turnConsole.fullTitle')} wide
      footer={<button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.close')}</button>}>
      {open && <TurnHistoryList history={history} />}
    </Modal>
  );
};

export default TurnConsoleModal;
