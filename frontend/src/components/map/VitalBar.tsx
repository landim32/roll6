import { useTranslation } from 'react-i18next';
import { vitalPercent } from '../../lib/vitals';

interface VitalBarProps {
  label: string;
  current: number;
  total: number;
  variant: 'life' | 'energy';
}

/** Thin life/energy bar with the "current/total" text. */
export const VitalBar = ({ label, current, total, variant }: VitalBarProps) => {
  const { t } = useTranslation();
  return (
    <div className="stm-vital">
      <div
        className="progress"
        role="progressbar"
        aria-label={t('party.vital', { label, current, total })}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className={`progress-bar ${variant === 'life' ? 'bg-danger' : 'bg-info'}`} style={{ width: `${vitalPercent(current, total)}%` }} />
      </div>
      <small>{current}/{total}</small>
    </div>
  );
};

export default VitalBar;
