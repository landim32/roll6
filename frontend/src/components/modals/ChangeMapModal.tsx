import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { MapIcon } from '../ui/icons';
import { useCampaign } from '../../hooks/useCampaign';
import type { MapTokenInfo } from '../../types/mapToken';
import type { TableMapInfo } from '../../types/campaign';

interface ChangeMapModalProps {
  /** Character/NPC piece being taken to another map; null = closed. */
  piece: MapTokenInfo | null;
  onClose: () => void;
  /** Takes the piece there; resolves when done (the window then closes), rejects to keep it open. */
  onChoose: (map: TableMapInfo) => Promise<void>;
}

/**
 * "Mudar de mapa" (111): the master picks another active map of the campaign and the piece goes to the same place there.
 * Choosing a map is the confirmation.
 */
export const ChangeMapModal = ({ piece, onClose, onChoose }: ChangeMapModalProps) => {
  const { t } = useTranslation();
  const { tableCampaigns, currentCampaign } = useCampaign();
  const [sending, setSending] = useState<number | null>(null);

  const maps = (tableCampaigns.find((c) => c.campaignId === currentCampaign?.campaignId)?.maps ?? [])
    .filter((map) => map.mapId !== piece?.mapId);

  const choose = async (map: TableMapInfo) => {
    if (sending !== null) return;
    setSending(map.mapId);
    try {
      await onChoose(map);
      onClose();
    } catch {
      // The page already said why; the window stays open for another choice.
    } finally {
      setSending(null);
    }
  };

  return (
    <Modal
      open={piece !== null}
      onOpenChange={(open) => { if (!open && sending === null) onClose(); }}
      title={t('changeMap.title', { name: piece?.name ?? '' })}
      footer={<button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending !== null}>{t('common.cancel')}</button>}
    >
      {maps.length === 0 ? (
        <p className="text-secondary mb-0">{t('changeMap.noOtherMap')}</p>
      ) : (
        <>
          <p className="text-secondary small">{t('changeMap.hint')}</p>
          <div className="list-group">
            {maps.map((map) => (
              <button key={map.mapId} type="button"
                className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                disabled={sending !== null} onClick={() => { void choose(map); }}>
                <MapIcon size={16} />
                <span className="flex-grow-1 text-truncate">{map.name}</span>
                {sending === map.mapId
                  ? <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  : <small className="text-secondary">{t('changeMap.characters', { count: map.characterCount })}</small>}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

export default ChangeMapModal;
