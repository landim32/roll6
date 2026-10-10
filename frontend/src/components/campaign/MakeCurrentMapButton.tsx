import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmModal } from '../ui/ConfirmModal';
import { PinMapIcon } from '../ui/icons';
import { useCampaign } from '../../hooks/useCampaign';
import { canMakeCurrent } from '../../lib/currentMap';

interface MakeCurrentMapButtonProps {
  map: { mapId: number; name: string; status: number };
  disabled?: boolean;
}

/**
 * "Tornar atual" (048): the master's deliberate switch of the map the players follow, after a confirmation. Shown only
 * on active maps other than the current one; the master stays on whatever map is open.
 */
export const MakeCurrentMapButton = ({ map, disabled = false }: MakeCurrentMapButtonProps) => {
  const { t } = useTranslation();
  const { isMaster, currentCampaign, makeCurrentMap } = useCampaign();
  const [confirming, setConfirming] = useState(false);

  if (!canMakeCurrent(map, { isMaster, currentMapId: currentCampaign?.currentMapId ?? null })) return null;

  const confirm = async () => {
    try {
      await makeCurrentMap(map.mapId);
      toast.success(t('currentMap.changed', { name: map.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  return (
    <>
      <button type="button" className="btn btn-sm btn-outline-primary" disabled={disabled}
        onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
        title={t('currentMap.make')} aria-label={t('currentMap.make')}>
        <PinMapIcon size={14} />
      </button>
      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        title={t('currentMap.make')}
        message={t('currentMap.confirm', { name: map.name })}
        confirmLabel={t('currentMap.confirmButton')}
        onConfirm={confirm}
      />
    </>
  );
};
