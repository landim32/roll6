import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { NpcFormModal } from '../modals/NpcFormModal';
import { NpcPickerModal } from '../modals/NpcPickerModal';
import { useNpc } from '../../hooks/useNpc';
import type { CampaignNpcInfo } from '../../types/npc';
import { PencilIcon } from '../ui/icons';

/**
 * "NPCs" tab (018): the campaign NPCs with their base vitals; the pencil edits (and can remove from the campaign)
 * through the NPC form, and "Incluir NPC" opens the picker — the same windows as the NPC panel.
 */
export const CampaignNpcsTab = () => {
  const { t } = useTranslation();
  const { campaignNpcs } = useNpc();
  const [editing, setEditing] = useState<CampaignNpcInfo | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPickerOpen(true)}>{t('npcs.add')}</button>
      </div>
      {campaignNpcs.length === 0 ? (
        <p className="text-body-secondary">{t('npcs.empty')}</p>
      ) : (
        <ul className="list-group stm-list stm-grid-list">
          {campaignNpcs.map((npc) => (
            <li key={npc.campaignNpcId} className="list-group-item stm-character-row">
              <CharacterAvatar name={npc.name} imageUrl={npc.imageUrl ?? npc.tokenImageUrl} />
              <div className="stm-character-text">
                <strong>{npc.name}</strong>
                <small className="text-body-secondary">
                  {t('party.life')} {npc.life} · {t('party.energy')} {npc.energy}
                </small>
              </div>
              <div className="stm-character-actions">
                <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('npcs.edit', { name: npc.name })}
                  title={t('npcs.edit', { name: npc.name })} onClick={() => setEditing(npc)}>
                  <PencilIcon size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NpcFormModal npc={editing} onClose={() => setEditing(null)} />
      <NpcPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  );
};

export default CampaignNpcsTab;
