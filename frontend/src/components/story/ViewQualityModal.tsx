import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { QUALITY_ORDER } from '../../lib/viewQuality';

interface ViewQualityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Bootstrap's `md` breakpoint: below it the device is taken for a phone, where the high levels also cost battery. */
const PHONE_QUERY = '(max-width: 767.98px)';

/**
 * "Qualidade do 3D" (053, issue #31), from the user menu: one radio per level — Padrão (the view of before), Alta,
 * Ultra — applied the moment it is chosen (an open 3D view redraws at once, the camera stays) and remembered on this
 * device. The same three levels everywhere; phones get one more sentence about the battery.
 */
export const ViewQualityModal = ({ open, onOpenChange }: ViewQualityModalProps) => {
  const { t } = useTranslation();
  const { viewQuality, setViewQuality } = useMapEditor();
  const phone = useMediaQuery(PHONE_QUERY);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('viewQuality.title')}
      footer={<button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.close')}</button>}
    >
      <p className="text-body-secondary small">{t('viewQuality.intro')}</p>
      <fieldset>
        <legend className="visually-hidden">{t('viewQuality.title')}</legend>
        {QUALITY_ORDER.map((level) => (
          <div key={level} className="form-check mb-2">
            <input
              type="radio"
              className="form-check-input"
              name="view-quality"
              id={`view-quality-${level}`}
              checked={viewQuality === level}
              onChange={() => setViewQuality(level)}
              aria-describedby={`view-quality-${level}-hint`}
            />
            <label className="form-check-label" htmlFor={`view-quality-${level}`}>{t(`viewQuality.level.${level}`)}</label>
            <small id={`view-quality-${level}-hint`} className="d-block text-body-secondary">{t(`viewQuality.levelHint.${level}`)}</small>
          </div>
        ))}
      </fieldset>
      <p className="small text-body-secondary mb-0">
        {t('viewQuality.costHint')}
        {phone && ` ${t('viewQuality.batteryHint')}`}
      </p>
    </Modal>
  );
};

export default ViewQualityModal;
