import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FinishTurnModal } from '../modals/FinishTurnModal';
import { InfinityIcon, LightningIcon } from '../ui/icons';
import { isPlayable } from '../../lib/campaignStatus';
import { isFreeMode } from '../../lib/freeMode';
import { useCampaign } from '../../hooks/useCampaign';
import { useTurn } from '../../hooks/useTurn';

/**
 * The master's turn controls (016): the "Livre" on/off button (054, any status — switching never touches the turn) and
 * "Finalizar turno" (only while the campaign plays). The turn number itself is shown in the map footer.
 */
export const TurnControls = () => {
  const { t } = useTranslation();
  const { isMaster, currentCampaign, setFreeMode } = useCampaign();
  const { turnNo, finish } = useTurn();
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (turnNo === null || !isMaster) return null;

  const freeMode = isFreeMode(currentCampaign);

  const toggleFreeMode = async () => {
    try {
      setSwitching(true);
      const next = !freeMode;
      await setFreeMode(next);
      toast.success(t(next ? 'toast.freeModeOn' : 'toast.freeModeOff'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSwitching(false);
    }
  };

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
      {/* An on/off button (the switch broke the phone menu): green while on; phones show only the icon. */}
      <button type="button" className={`btn btn-sm stm-free-mode-toggle ${freeMode ? 'btn-success' : 'btn-outline-secondary'}`}
        aria-pressed={freeMode} disabled={switching} onClick={() => { void toggleFreeMode(); }}
        title={t(freeMode ? 'turn.freeModeOnTitle' : 'turn.freeModeOffTitle')} aria-label={t('turn.freeModeTitle')}>
        <InfinityIcon size={16} />
        <span className="d-none d-md-inline">{t('turn.freeMode')}</span>
      </button>
      {/* 049: the turn only ends while the campaign plays. */}
      {isPlayable(currentCampaign?.status) && (
        <>
          {/* Phones: only the lightning icon, so the button doesn't push the menu onto another line. */}
          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => { void run(false); }} disabled={busy}
            title={t('turn.finish')} aria-label={t('turn.finish')}>
            <LightningIcon size={16} className="d-md-none" />
            <span className="d-none d-md-inline">{t('turn.finish')}</span>
          </button>
          <FinishTurnModal pending={pending} onBack={() => setPending([])} onForce={() => run(true)} />
        </>
      )}
    </div>
  );
};

export default TurnControls;
