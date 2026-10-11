import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCampaign } from '../../hooks/useCampaign';
import { CAMPAIGN_STATUS_OPTIONS, statusLabelKey } from '../../lib/campaignStatus';

/**
 * The master's campaign status (049) at the top of the campaign settings: saved as soon as it is chosen; connected
 * players get it through `campaign.changed`.
 */
export const CampaignStatusSelect = () => {
  const { t } = useTranslation();
  const { currentCampaign, setCampaignStatus } = useCampaign();
  const [saving, setSaving] = useState(false);
  if (!currentCampaign) return null;

  const change = async (status: number) => {
    if (status === currentCampaign.status) return;
    setSaving(true);
    try {
      await setCampaignStatus(status);
      toast.success(t('campaignStatus.changed', { status: t(statusLabelKey(status)) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3">
      <label className="form-label mb-1" htmlFor="campaign-status">{t('campaignStatus.title')}</label>
      <select
        id="campaign-status"
        className="form-select"
        value={currentCampaign.status}
        disabled={saving}
        onChange={(event) => void change(Number(event.target.value))}
      >
        {CAMPAIGN_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>{t(statusLabelKey(status))}</option>
        ))}
      </select>
      <div className="form-text">{t('campaignStatus.hint')}</div>
    </div>
  );
};
