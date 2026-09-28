import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useCampaign } from '../../hooks/useCampaign';
import { useTurn } from '../../hooks/useTurn';
import { turnService } from '../../Services/turnService';

interface TurnLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Readable markdown of a turn (024), opened from "Turno N" in the footer: pick the turn, read and copy it. Reloads
 * while open whenever the turn in progress changes (moves, actions, character changes, finishing).
 */
export const TurnLogModal = ({ open, onOpenChange }: TurnLogModalProps) => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const { turnNo: currentTurn, entries } = useTurn();
  const campaignId = currentCampaign?.campaignId ?? null;
  const [selected, setSelected] = useState<number | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);

  // Opening (or a new turn in progress) shows the turn in progress.
  useEffect(() => {
    if (open) setSelected(currentTurn);
  }, [open, currentTurn]);

  useEffect(() => {
    if (!open || campaignId === null || selected === null) return;
    let alive = true;
    turnService.summary(campaignId, selected)
      .then((summary) => { if (alive) setMarkdown(summary.markdown); })
      .catch((err) => {
        if (!alive) return;
        setMarkdown('');
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      });
    return () => { alive = false; };
    // `entries` changes whenever something is recorded in the turn in progress.
  }, [open, campaignId, selected, entries, t]);

  const copy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success(t('turnLog.copied'));
    } catch {
      toast.error(t('turnLog.copyFailed'));
    }
  };

  const turns = currentTurn === null ? [] : Array.from({ length: currentTurn }, (_, i) => currentTurn - i);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('turnLog.title')}
      large
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.close')}</button>
          <button type="button" className="btn btn-primary" onClick={copy} disabled={!markdown}>{t('turnLog.copy')}</button>
        </>
      )}
    >
      <div className="d-flex align-items-center gap-2 mb-3">
        <label className="form-label mb-0" htmlFor="turn-log-select">{t('turnLog.turn')}</label>
        <select id="turn-log-select" className="form-select w-auto" value={selected ?? ''}
          onChange={(e) => { setMarkdown(null); setSelected(Number(e.target.value)); }}>
          {turns.map((no) => (
            <option key={no} value={no}>{no === currentTurn ? t('turnLog.current', { no }) : no}</option>
          ))}
        </select>
      </div>
      {markdown === null
        ? <p className="text-body-secondary mb-0">{t('common.loading')}</p>
        : <pre className="stm-turn-log">{markdown}</pre>}
    </Modal>
  );
};

export default TurnLogModal;
