import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useTurn } from '../../hooks/useTurn';
import { TURN_TYPE } from '../../types/turn';
import type { TurnInfo } from '../../types/turn';

const MarkdownView = lazy(() => import('../ui/MarkdownView'));

interface TurnSummaryModalProps {
  /** Finished turn to show; null closes the modal. */
  turnNo: number | null;
  onClose: () => void;
}

/** The bell's "turn finished" window: only the turn's narration, as sanitized markdown. */
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

  const narrations = (entries ?? []).filter((entry) => entry.turnType === TURN_TYPE.narration);

  return (
    <Modal open={turnNo !== null} onOpenChange={(value) => { if (!value) onClose(); }} title={t('turn.summaryTitle', { no: turnNo ?? '' })} large>
      {entries === null ? (
        <p className="text-body-secondary mb-0">{t('common.loading')}</p>
      ) : narrations.length === 0 ? (
        <p className="text-body-secondary mb-0">{t('turn.noNarration')}</p>
      ) : (
        narrations.map((entry) => (
          <div key={entry.turnId} className="stm-turn-narration">
            <Suspense fallback={<p className="mb-0">{entry.description}</p>}>
              <MarkdownView value={entry.description ?? ''} emptyText="" />
            </Suspense>
          </div>
        ))
      )}
    </Modal>
  );
};

export default TurnSummaryModal;
