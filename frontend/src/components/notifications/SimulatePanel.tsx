import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { pushService } from '../../Services/pushService';
import { SIMULATE_KINDS, testSummaryKey } from '../../lib/push';
import type { SimulateKind } from '../../lib/push';
import type { TurnNoticePreviewInfo } from '../../types/push';

interface SimulatePanelProps {
  campaignId: number;
  campaignName: string;
}

/**
 * "Simular" (074), for the master of the current campaign: sends to their own devices any kind of notice exactly as
 * the table would (titled "Teste · …", nobody else gets it, nothing is stored), and previews the "Falta…" each player
 * still missing would get with the next first action.
 */
export const SimulatePanel = ({ campaignId, campaignName }: SimulatePanelProps) => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<SimulateKind>('message');
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<TurnNoticePreviewInfo | null>(null);
  const [previewError, setPreviewError] = useState(false);

  const loadPreview = useCallback(() => {
    setPreviewError(false);
    pushService.preview(campaignId).then(setPreview).catch(() => setPreviewError(true));
  }, [campaignId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const send = async () => {
    try {
      setSending(true);
      const answer = await pushService.simulate(campaignId, kind);
      toast.info(t(testSummaryKey(answer.devices)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="stm-simulate-panel">
      <p className="small text-body-secondary mb-2">{t('notifications.simulate.hint', { campaign: campaignName })}</p>
      <div className="d-flex gap-2 flex-wrap mb-3">
        <select className="form-select form-select-sm w-auto" value={kind} aria-label={t('notifications.simulate.kind')}
          onChange={(e) => setKind(e.target.value as SimulateKind)}>
          {SIMULATE_KINDS.map((k) => <option key={k} value={k}>{t(`notifications.simulate.kinds.${k}`)}</option>)}
        </select>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => { void send(); }} disabled={sending}>
          {t('notifications.simulate.send')}
        </button>
      </div>

      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="fw-semibold small">{t('notifications.preview.title')}</span>
        <button type="button" className="btn btn-sm btn-link p-0" onClick={loadPreview}>{t('notifications.preview.refresh')}</button>
      </div>
      {previewError && <p className="text-body-secondary small mb-0">{t('notifications.preview.failed')}</p>}
      {!previewError && preview === null && <p className="text-body-secondary small mb-0">{t('common.loading')}</p>}
      {preview && (
        <>
          <p className="small mb-1">
            {t('notifications.preview.summary', { turn: preview.turnNo, acted: preview.acted, approved: preview.approved, threshold: preview.threshold })}
          </p>
          {preview.pending.length === 0 && <p className="text-body-secondary small mb-0">{t('notifications.preview.nobody')}</p>}
          <ul className="list-unstyled small mb-0">
            {preview.pending.map((p) => (
              <li key={p.userId}>
                <span className="fw-semibold">{p.name}</span>
                <span className="text-body-secondary"> ({p.characters.join(', ')})</span>
                {': '}
                {p.body ? <span>“{p.body}”</span> : <span className="text-body-secondary">{t('notifications.preview.beforeMajority')}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SimulatePanel;
