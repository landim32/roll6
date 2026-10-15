import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { DeviceList } from './DeviceList';
import { SimulatePanel } from './SimulatePanel';
import { usePush } from '../../hooks/usePush';
import { useCampaign } from '../../hooks/useCampaign';
import { pushService } from '../../Services/pushService';
import { PUSH_SUPPORT, resultKey } from '../../lib/push';
import type { CampaignNotificationInfo } from '../../types/push';

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Notificações" (043): this device on/off — the browser's permission is asked only by the "Ativar" tap — and the
 * campaigns of the user's table, each one muted or not (valid on every device of the user). Since 074 also "Enviar
 * teste" for this device, the list of the user's devices and, for the master of the current campaign, "Simular".
 */
export const NotificationsModal = ({ open, onOpenChange }: NotificationsModalProps) => {
  const { t } = useTranslation();
  const { support, available, permission, subscribed, busy, enable, disable, endpoint } = usePush();
  const { currentCampaign, isMaster } = useCampaign();
  const [campaigns, setCampaigns] = useState<CampaignNotificationInfo[] | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [devicesKey, setDevicesKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCampaigns(null);
    setTestResult(null);
    pushService.listCampaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, [open]);

  // Another device list after this one is turned on or off.
  useEffect(() => {
    setDevicesKey((key) => key + 1);
  }, [subscribed, endpoint]);

  /** 074: a push to this device right now; the answer says whether the push service took it. */
  const onTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const answer = await pushService.test(endpoint);
      setTestResult(t(resultKey(answer.devices[0]?.result ?? 'failed')));
      setDevicesKey((key) => key + 1);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setTesting(false);
    }
  };

  const onEnable = async () => {
    try {
      const result = await enable();
      if (result === 'enabled') toast.success(t('notifications.enabled'));
      else if (result === 'denied') toast.error(t('notifications.denied'), { description: t('notifications.deniedHint') });
      else if (result === 'unavailable') toast.error(t('notifications.unavailable'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const onDisable = async () => {
    try {
      await disable();
      toast.success(t('notifications.disabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const onMute = async (campaign: CampaignNotificationInfo, muted: boolean) => {
    try {
      setSaving(campaign.campaignId);
      const saved = await pushService.setMuted(campaign.campaignId, muted);
      setCampaigns((list) => list?.map((c) => (c.campaignId === saved.campaignId ? saved : c)) ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSaving(null);
    }
  };

  const deviceStatus = () => {
    if (support === PUSH_SUPPORT.unsupported) return <p className="text-body-secondary mb-0">{t('notifications.unsupported')}</p>;
    if (available === false) return <p className="text-body-secondary mb-0">{t('notifications.unavailable')}</p>;
    if (support === PUSH_SUPPORT.needsInstall) {
      return (
        <>
          <p className="text-body-secondary">{t('notifications.needsInstall')}</p>
          <button type="button" className="btn btn-primary" onClick={() => { void onEnable(); }}>{t('notifications.howToInstall')}</button>
        </>
      );
    }
    if (permission === 'denied') {
      return (
        <>
          <p className="mb-1"><span className="badge text-bg-danger">{t('notifications.blocked')}</span></p>
          <p className="text-body-secondary small mb-0">{t('notifications.deniedHint')}</p>
        </>
      );
    }
    return (
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <span className={`badge ${subscribed ? 'text-bg-success' : 'text-bg-secondary'}`}>
          {t(subscribed ? 'notifications.on' : 'notifications.off')}
        </span>
        {subscribed ? (
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { void onDisable(); }} disabled={busy}>
              {t('notifications.disable')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { void onTest(); }} disabled={busy || testing || !endpoint}>
              {t('notifications.test.send')}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => { void onEnable(); }} disabled={busy || available === null}>
            {t('notifications.enable')}
          </button>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('notifications.title')}>
      <h6>{t('notifications.device')}</h6>
      {deviceStatus()}
      {testResult && <p className="small mt-2 mb-0" role="status">{testResult}</p>}
      <p className="small text-body-secondary mt-2 mb-3">{t('notifications.whatArrives')}</p>

      <h6>{t('notifications.devices.title')}</h6>
      <div className="mb-3">
        <DeviceList endpoint={subscribed ? endpoint : null} reloadKey={devicesKey} />
      </div>

      <h6>{t('notifications.campaigns')}</h6>
      {campaigns === null && <p className="text-body-secondary small">{t('common.loading')}</p>}
      {campaigns?.length === 0 && <p className="text-body-secondary small">{t('notifications.noCampaigns')}</p>}
      <ul className="list-unstyled mb-0">
        {campaigns?.map((campaign) => (
          <li key={campaign.campaignId} className="form-check form-switch py-1">
            <input className="form-check-input" type="checkbox" role="switch" id={`mute-${campaign.campaignId}`}
              checked={!campaign.muted} disabled={saving === campaign.campaignId}
              onChange={(e) => { void onMute(campaign, !e.target.checked); }} />
            <label className="form-check-label" htmlFor={`mute-${campaign.campaignId}`}>
              {campaign.campaignName}
              {campaign.muted && <span className="text-body-secondary small"> · {t('notifications.muted')}</span>}
            </label>
          </li>
        ))}
      </ul>

      {isMaster && currentCampaign && (
        <>
          <h6 className="mt-3">{t('notifications.simulate.title')}</h6>
          <SimulatePanel campaignId={currentCampaign.campaignId} campaignName={currentCampaign.name} />
        </>
      )}
    </Modal>
  );
};

export default NotificationsModal;
