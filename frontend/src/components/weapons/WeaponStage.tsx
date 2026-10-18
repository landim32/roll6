import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GripPoint, WeaponPose } from '../../types/weapon';

const WeaponPreview = lazy(() => import('./WeaponPreview'));

interface WeaponStageProps {
  /** The weapon's file (presigned URL or blob URL); null shows the empty stage. */
  url: string | null;
  name?: string;
  /** Edit mode (083): the pose drawn, the axes and the grip marker shown, a click picks the grip point. */
  editable?: boolean;
  pose?: WeaponPose;
  gripPoint?: GripPoint;
  onPickGrip?: (point: GripPoint) => void;
}

/** The square stage of a weapon's preview (082): the lazy three.js preview, or a note while loading / on failure. */
export const WeaponStage = ({ url, name, editable, pose, gripPoint, onPickGrip }: WeaponStageProps) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<string | null>(null);
  const error = failed !== null && failed === url;

  return (
    <div className="stm-model-stage">
      {url && !error && (
        <Suspense fallback={<div className="stm-model-stage-note small text-secondary">{t('weapons.loading')}</div>}>
          <WeaponPreview key={url} url={url} label={t('weapons.previewLabel', { name: name ?? '' })}
            editable={editable} pose={pose} gripPoint={gripPoint} onPickGrip={onPickGrip}
            onError={() => setFailed(url)} />
        </Suspense>
      )}
      {!url && <div className="stm-model-stage-note small text-secondary">{t('weapons.noFile')}</div>}
      {error && <div className="stm-model-stage-note small text-danger">{t('weapons.loadFailed')}</div>}
    </div>
  );
};

export default WeaponStage;
