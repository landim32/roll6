import { useTranslation } from 'react-i18next';
import { NPC_CATEGORIES, NPC_CATEGORY } from '../../types/npc';
import type { NpcCategory } from '../../types/npc';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import { toCategory } from '../../lib/npcCategory';

interface CampaignNpcFieldsProps {
  idPrefix: string;
  category: NpcCategory;
  /** The ally's master participation; null = none. */
  master: number | null;
  /** The approved characters of the campaign: who may be an ally's master. */
  party: readonly CampaignCharacterInfo[];
  onChange: (category: NpcCategory, master: number | null) => void;
}

/**
 * "Nesta campanha" of an NPC (071): its category in this campaign and, only for allies, the master character whose
 * owner commands it. Choosing Inimigo or Neutro clears the master.
 */
export const CampaignNpcFields = ({ idPrefix, category, master, party, onChange }: CampaignNpcFieldsProps) => {
  const { t } = useTranslation();
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <fieldset className="mt-3">
      <legend className="fs-6 fw-semibold">{t('npcs.campaignSection')}</legend>
      <div className="row g-2">
        <div className="col-sm-5">
          <label className="form-label" htmlFor={id('category')}>{t('npcs.categoryLabel')}</label>
          <select id={id('category')} className="form-select" value={String(category)}
            onChange={(e) => {
              const next = toCategory(e.target.value);
              onChange(next, next === NPC_CATEGORY.ally ? master : null);
            }}>
            {NPC_CATEGORIES.map((value) => <option key={value} value={String(value)}>{t(`npcs.category.${value}`)}</option>)}
          </select>
        </div>
        {category === NPC_CATEGORY.ally && (
          <div className="col-sm-7">
            <label className="form-label" htmlFor={id('master')}>{t('npcs.master')}</label>
            <select id={id('master')} className="form-select" value={master === null ? '' : String(master)}
              onChange={(e) => onChange(category, e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">{t('npcs.masterNone')}</option>
              {party.map((member) => (
                <option key={member.campaignCharacterId} value={String(member.campaignCharacterId)}>
                  {member.characterName} — {member.characterOwnerName}
                </option>
              ))}
            </select>
            <div className="form-text">{t('npcs.masterHint')}</div>
          </div>
        )}
      </div>
    </fieldset>
  );
};

export default CampaignNpcFields;
