import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { NpcFormModal } from '../modals/NpcFormModal';
import { NpcPickerModal } from '../modals/NpcPickerModal';
import { useNpc } from '../../hooks/useNpc';
import type { CampaignNpcInfo } from '../../types/npc';

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
  </svg>
);

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
        <ul className="list-group stm-list">
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
                  <PencilIcon />
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
