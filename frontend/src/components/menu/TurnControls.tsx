import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FinishTurnModal } from '../modals/FinishTurnModal';
import { useCampaign } from '../../hooks/useCampaign';
import { useTurn } from '../../hooks/useTurn';

/** "Finalizar turno" for the master (016); the turn number itself is shown in the map footer. */
export const TurnControls = () => {
  const { t } = useTranslation();
  const { isMaster } = useCampaign();
  const { turnNo, finish } = useTurn();
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (turnNo === null || !isMaster) return null;

  const run = async (force: boolean) => {
    try {
      setBusy(true);
      const result = await finish(force);
      if (result.finished) {
        setPending([]);
        toast.success(t('toast.turnFinished', { no: result.finishedTurn }));
      } else {
        setPending(result.pending);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stm-turn-controls">
      <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => { void run(false); }} disabled={busy}>
        {t('turn.finish')}
      </button>
      <FinishTurnModal pending={pending} onBack={() => setPending([])} onForce={() => run(true)} />
    </div>
  );
};

export default TurnControls;
