import { useTranslation } from 'react-i18next';
import { DEFAULT_GRIP, GRIP_FIELDS, GRIP_RANGES, clampGrip, isDefaultGrip } from '../../lib/weaponGrip';
import type { WeaponGrip } from '../../types/weapon';

interface WeaponGripFieldsProps {
  id: string;
  grip: WeaponGrip;
  onChange: (grip: WeaponGrip) => void;
  disabled?: boolean;
}

/** How a grip value reads next to its slider: position in % of the height, rotation in degrees, size in %. */
const formatValue = (field: keyof WeaponGrip, value: number): string => {
  if (field === 'scale') return `${value}%`;
  if (field === 'rx' || field === 'ry' || field === 'rz') return `${Math.round(value)}°`;
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
};

/**
 * The grip of the weapon in one hand (082, US3): position (X, Y, Z in % of the character's height), rotation (X, Y, Z
 * in degrees) and size (% of the default), each a slider whose change the preview shows at once, plus "Voltar ao padrão".
 * The grip belongs to this token and this hand (Q1 = B).
 */
export const WeaponGripFields = ({ id, grip, onChange, disabled = false }: WeaponGripFieldsProps) => {
  const { t } = useTranslation();

  return (
    <fieldset className="stm-weapon-grip mt-3" disabled={disabled}>
      <legend className="form-label small mb-1">{t('tokens.weapons.grip')}</legend>
      {GRIP_FIELDS.map((field) => {
        const range = GRIP_RANGES[field];
        const label = t(`tokens.weapons.field.${field}`);
        return (
          <div key={field} className="mb-1">
            <label htmlFor={`${id}-${field}`} className="form-label small mb-0 d-flex justify-content-between">
              <span>{label}</span>
              <output htmlFor={`${id}-${field}`} className="fw-semibold">{formatValue(field, grip[field])}</output>
            </label>
            <input
              id={`${id}-${field}`}
              type="range"
              className="form-range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={grip[field]}
              aria-valuetext={formatValue(field, grip[field])}
              onChange={(event) => onChange(clampGrip({ ...grip, [field]: Number(event.target.value) }))}
            />
          </div>
        );
      })}
      <div className="d-flex justify-content-between align-items-center">
        <div className="form-text mt-0">{t('tokens.weapons.gripHint')}</div>
        <button type="button" className="btn btn-link btn-sm p-0 flex-shrink-0" disabled={isDefaultGrip(grip)}
          onClick={() => onChange(DEFAULT_GRIP)}>
          {t('tokens.weapons.gripReset')}
        </button>
      </div>
    </fieldset>
  );
};

export default WeaponGripFields;
