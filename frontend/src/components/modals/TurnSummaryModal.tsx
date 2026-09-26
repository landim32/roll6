import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useTurn } from '../../hooks/useTurn';
import { TURN_TYPE } from '../../types/turn';
import type { TurnInfo } from '../../types/turn';

interface TurnSummaryModalProps {
  /** Finished turn to show; null closes the modal. */
  turnNo: number | null;
  onClose: () => void;
}

const typeLabel: Record<number, string> = {
  [TURN_TYPE.movement]: 'turn.movement',
  [TURN_TYPE.action]: 'turn.action',
  [TURN_TYPE.actionResult]: 'turn.result',
};

/** Everything done in a turn, in order: moves, actions and action results. */
export const TurnSummaryModal = ({ turnNo, onClose }: TurnSummaryModalProps) => {
  const { t } = useTranslation();
  const { listTurn } = useTurn();
  const [entries, setEntries] = useState<TurnInfo[] | null>(null);

  useEffect(() => {
    if (turnNo === null) return;
    let alive = true;
    setEntries(null);
    listTurn(turnNo)
      .then((list) => { if (alive) setEntries(list); })
      .catch((err: unknown) => {
        if (!alive) return;
        setEntries([]);
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      });
    return () => { alive = false; };
  }, [turnNo, listTurn, t]);

  const describe = (entry: TurnInfo): string => entry.turnType === TURN_TYPE.movement
    ? t('turn.moved', { fromX: entry.beforeX, fromY: entry.beforeY, x: entry.x, y: entry.y })
    : entry.description ?? '';

  return (
    <Modal open={turnNo !== null} onOpenChange={(value) => { if (!value) onClose(); }} title={t('turn.summaryTitle', { no: turnNo ?? '' })} large>
      {entries === null ? (
        <p className="text-body-secondary mb-0">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className="text-body-secondary mb-0">{t('turn.summaryEmpty')}</p>
      ) : (
        <ol className="stm-turn-summary">
          {entries.map((entry) => (
            <li key={entry.turnId} className={`is-type-${entry.turnType}`}>
              <span className="badge stm-turn-type">{t(typeLabel[entry.turnType] ?? 'turn.action')}</span>
              <strong className="me-1">{entry.actorName}</strong>
              <span className="stm-turn-text">{describe(entry)}</span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
};

export default TurnSummaryModal;
