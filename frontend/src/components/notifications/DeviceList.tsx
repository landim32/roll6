import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { pushService } from '../../Services/pushService';
import { parseUtc } from '../../lib/apiKeyForm';
import { deviceResultKey, testSummaryKey } from '../../lib/push';
import type { PushDeviceInfo, PushTestDeviceInfo } from '../../types/push';

interface DeviceListProps {
  /** This browser's endpoint, to mark its row; null when this device is off. */
  endpoint: string | null;
  /** Bumped by the parent after this device is turned on/off or tested, to read the list again. */
  reloadKey: number;
}

const formatDate = (value: string | null): string | null =>
  value ? parseUtc(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;

/**
 * "Aparelhos" (074): every device of the user that receives notifications — which one is this, the last delivery that
 * worked and a badge for the ones skipped after failing in a row — and "Testar todos".
 */
export const DeviceList = ({ endpoint, reloadKey }: DeviceListProps) => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<PushDeviceInfo[] | null>(null);
  const [results, setResults] = useState<Record<number, PushTestDeviceInfo['result']>>({});
  const [testing, setTesting] = useState(false);

  const load = useCallback(() => {
    pushService.devices().then(setDevices).catch(() => setDevices([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const testAll = async () => {
    try {
      setTesting(true);
      const answer = await pushService.test(null);
      setResults(Object.fromEntries(answer.devices.map((d) => [d.pushSubscriptionId, d.result])));
      toast.info(t(testSummaryKey(answer.devices)));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setTesting(false);
    }
  };

  if (devices === null) return <p className="text-body-secondary small">{t('common.loading')}</p>;
  if (devices.length === 0) return <p className="text-body-secondary small mb-0">{t('notifications.devices.none')}</p>;

  return (
    <>
      <ul className="list-group mb-2 stm-device-list">
        {devices.map((device) => {
          const last = formatDate(device.lastSuccessAt);
          const result = results[device.pushSubscriptionId];
          return (
            <li key={device.pushSubscriptionId} className="list-group-item d-flex flex-wrap align-items-center gap-2">
              <span className="fw-semibold">{device.label}</span>
              {device.endpoint === endpoint && <span className="badge text-bg-primary">{t('notifications.devices.this')}</span>}
              {device.skipped && <span className="badge text-bg-warning" title={t('notifications.devices.skippedHint')}>{t('notifications.devices.skipped')}</span>}
              {result && <span className={`badge ${result === 'sent' ? 'text-bg-success' : 'text-bg-danger'}`}>{t(deviceResultKey(result))}</span>}
              <span className="text-body-secondary small ms-auto">
                {last ? t('notifications.devices.lastSuccess', { when: last }) : t('notifications.devices.never')}
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { void testAll(); }} disabled={testing}>
        {t('notifications.devices.testAll')}
      </button>
    </>
  );
};

export default DeviceList;
