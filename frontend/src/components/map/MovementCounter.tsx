import { useTranslation } from 'react-i18next';
import type { MovementStatus } from '../../lib/movement';

interface MovementCounterProps {
  spent: number | null;
  total: number;
  status: MovementStatus;
}

/** "spent/total" in the bottom-right corner while a character or NPC is moving (015). */
export const MovementCounter = ({ spent, total, status }: MovementCounterProps) => {
  const { t } = useTranslation();
  return (
    <div className={`stm-move-counter is-${status}`} role="status" aria-live="polite">
      <small>{t('movement.counter')}</small>
      <strong>{spent ?? '–'}/{total}</strong>
      <small className="stm-move-hint">{t('movement.hint')}</small>
    </div>
  );
};

export default MovementCounter;
