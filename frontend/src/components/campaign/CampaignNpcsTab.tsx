import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmModal } from '../ui/ConfirmModal';
import { NpcPickerModal } from '../modals/NpcPickerModal';
import { CampaignNpcFields } from '../npcs/CampaignNpcFields';
import { CardGrid } from '../library/CardGrid';
import { LibraryCard } from '../library/LibraryCard';
import { useCharacter } from '../../hooks/useCharacter';
import { useNpc } from '../../hooks/useNpc';
import { npcPath } from '../../lib/libraryRoutes';
import { NPC_CATEGORY } from '../../types/npc';
import type { CampaignNpcInfo, NpcCategory } from '../../types/npc';
import { PencilIcon, PersonBadgeIcon, TrashIcon } from '../ui/icons';

/** Badge color per category (071): enemies red, neutrals gray, allies teal like their pieces. */
const CATEGORY_BADGE: Record<NpcCategory, string> = {
  [NPC_CATEGORY.enemy]: 'text-bg-danger',
  [NPC_CATEGORY.neutral]: 'text-bg-secondary',
  [NPC_CATEGORY.ally]: 'text-bg-info',
};

/**
 * "NPCs" of the campaign page (087; was the settings window's tab and the NPC window): since 098 the campaign NPCs
 * are cards in 4 columns like the library (the picture large on top), each with its category badge, "Nesta campanha"
 * (category and an ally's master character, 071) saved on change, the pencil to the NPC's own page and "Retirar da
 * campanha" with today's confirmation. "Incluir NPC" opens the picker.
 */
export const CampaignNpcsTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      <CardGrid
        items={campaignNpcs}
        cols={4}
        getKey={(npc) => npc.campaignNpcId}
        emptyText={t('npcs.empty')}
        renderCard={(npc) => {
          const image = npc.imageUrl ?? npc.tokenImageUrl;
          return (
            <LibraryCard
              ratio="square"
              title={npc.name}
              figure={image ? <img src={image} alt={npc.name} loading="lazy" /> : undefined}
              fallback={<PersonBadgeIcon />}
              onOpen={() => navigate(npcPath(npc.npcId))}
              meta={`${t('party.life')} ${npc.life} · ${t('party.energy')} ${npc.energy}`}
              badges={<span className={`badge ${CATEGORY_BADGE[npc.category]}`}>{t(`npcs.category.${npc.category}`)}</span>}
              extra={(
                <CampaignNpcFields
                  compact
                  idPrefix={`campaign-npc-${npc.campaignNpcId}`}
                  category={npc.category}
                  master={npc.masterCampaignCharacterId}
                  party={party}
                  onChange={(category, master) => { void classify(npc, category, master); }}
                />
              )}
              actions={(
                <>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate(npcPath(npc.npcId))}
                    aria-label={t('npcs.edit', { name: npc.name })} title={t('npcs.edit', { name: npc.name })}>
                    <PencilIcon size={14} />
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" disabled={busyId === npc.campaignNpcId}
                    aria-label={t('npcs.remove')} title={t('npcs.remove')} onClick={() => setRemoving(npc)}>
                    <TrashIcon size={14} />
                  </button>
                </>
              )}
            />
          );
        }}
      />
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
