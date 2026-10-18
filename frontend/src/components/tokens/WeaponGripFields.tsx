import { useTranslation } from 'react-i18next';
import { FINE_FIELDS, GRIP_RANGES, clampGrip, isDefaultFine, resetFine } from '../../lib/weaponGrip';
import type { WeaponGrip } from '../../types/weapon';

interface WeaponGripFieldsProps {
  id: string;
  grip: WeaponGrip;
  onChange: (grip: WeaponGrip) => void;
  disabled?: boolean;
}

/** How a fine value reads next to its slider: position in % of the height, rotation in degrees. */
const formatValue = (field: keyof WeaponGrip, value: number): string => {
  if (field === 'rx' || field === 'ry' || field === 'rz') return `${Math.round(value)}°`;
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
};

/**
 * The fine adjustment of the weapon in one socket (083, US3): position (X, Y, Z in % of the character's height) and
 * rotation (X, Y, Z in degrees) from the socket's own place, in the socket's frame, each a slider whose change the preview
 * shows at once, plus "Voltar ao padrão" (which keeps the size). It belongs to this token and this socket.
 */
export const WeaponGripFields = ({ id, grip, onChange, disabled = false }: WeaponGripFieldsProps) => {
  const { t } = useTranslation();

  return (
    <fieldset className="stm-weapon-grip mt-2" disabled={disabled}>
      {FINE_FIELDS.map((field) => {
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
        <div className="form-text mt-0">{t('tokens.weapons.fineHint')}</div>
        <button type="button" className="btn btn-link btn-sm p-0 flex-shrink-0" disabled={isDefaultFine(grip)}
          onClick={() => onChange(resetFine(grip))}>
          {t('tokens.weapons.gripReset')}
        </button>
      </div>
    </fieldset>
  );
};

export default WeaponGripFields;
