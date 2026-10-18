import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { ConfirmModal } from '../ui/ConfirmModal';
import { NpcPickerModal } from '../modals/NpcPickerModal';
import { CampaignNpcFields } from '../npcs/CampaignNpcFields';
import { useCharacter } from '../../hooks/useCharacter';
import { useNpc } from '../../hooks/useNpc';
import { npcPath } from '../../lib/libraryRoutes';
import { NPC_CATEGORY } from '../../types/npc';
import type { CampaignNpcInfo, NpcCategory } from '../../types/npc';
import { PencilIcon, TrashIcon } from '../ui/icons';

/**
 * "NPCs" of the campaign page (087; was the settings window's tab and the NPC window): each campaign NPC with its
 * category and an ally's master character ("Nesta campanha", 071) saved on the row, "Retirar da campanha" with
 * today's confirmation, and the pencil to the NPC's own page in the library. "Incluir NPC" opens the picker.
 */
export const CampaignNpcsTab = () => {
  const { t } = useTranslation();
  const { campaignNpcs, updateCampaignNpc, removeFromCampaign } = useNpc();
  const { party } = useCharacter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState<CampaignNpcInfo | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const classify = async (npc: CampaignNpcInfo, category: NpcCategory, master: number | null) => {
    setBusyId(npc.campaignNpcId);
    try {
      await updateCampaignNpc(npc.campaignNpcId, { category, masterCampaignCharacterId: category === NPC_CATEGORY.ally ? master : null });
      toast.success(t('toast.npcUpdated', { name: npc.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await removeFromCampaign(removing.campaignNpcId);
      toast.success(t('toast.npcRemoved', { name: removing.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      throw err;
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPickerOpen(true)}>{t('npcs.add')}</button>
      </div>
      {campaignNpcs.length === 0 ? (
        <p className="text-body-secondary">{t('npcs.empty')}</p>
      ) : (
        <ul className="list-group stm-list">
          {campaignNpcs.map((npc) => (
            <li key={npc.campaignNpcId} className="list-group-item">
              <div className="stm-character-row">
                <CharacterAvatar name={npc.name} imageUrl={npc.imageUrl ?? npc.tokenImageUrl} />
                <div className="stm-character-text">
                  <strong>{npc.name}</strong>
                  <small className="text-body-secondary">
                    {t('party.life')} {npc.life} · {t('party.energy')} {npc.energy}
                  </small>
                </div>
                <div className="stm-character-actions">
                  <Link to={npcPath(npc.npcId)} className="btn btn-sm btn-outline-secondary"
                    aria-label={t('npcs.edit', { name: npc.name })} title={t('npcs.edit', { name: npc.name })}>
                    <PencilIcon size={14} />
                  </Link>
                  <button type="button" className="btn btn-sm btn-outline-danger" disabled={busyId === npc.campaignNpcId}
                    aria-label={t('npcs.remove')} title={t('npcs.remove')} onClick={() => setRemoving(npc)}>
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              <CampaignNpcFields
                idPrefix={`campaign-npc-${npc.campaignNpcId}`}
                category={npc.category}
                master={npc.masterCampaignCharacterId}
                party={party}
                onChange={(category, master) => { void classify(npc, category, master); }}
              />
            </li>
          ))}
        </ul>
      )}
      <NpcPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
      <ConfirmModal
        open={removing !== null}
        onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title={t('npcs.removeTitle')}
        message={removing ? t('npcs.removeMessage', { name: removing.name, count: removing.mapNpcCount }) : ''}
        confirmLabel={t('npcs.remove')}
        onConfirm={remove}
        danger
      />
    </>
  );
};

export default CampaignNpcsTab;
