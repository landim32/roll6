import { useTranslation } from 'react-i18next';
import { DEFAULT_GRIP_POINT, isDefaultGripPoint, normalizePose, signedDegrees, turnPose } from '../../lib/weaponPose';
import type { PoseAxis, PoseDirection } from '../../lib/weaponPose';
import type { GripPoint, WeaponPose } from '../../types/weapon';
import {
  ArrowClockwiseIcon, ArrowCounterclockwiseIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon,
} from '../ui/icons';

interface WeaponPoseFieldsProps {
  pose: WeaponPose;
  gripPoint: GripPoint;
  onPose: (pose: WeaponPose) => void;
  onGripPoint: (point: GripPoint) => void;
  disabled?: boolean;
}

interface Turn {
  key: string;
  axis: PoseAxis;
  direction: PoseDirection;
  Icon: typeof ArrowUpIcon;
}

/** The six ±90° turns about the stage's axes (083): tilt (X), turn (Y), roll (Z). */
const TURNS: Turn[] = [
  { key: 'tiltUp', axis: 'x', direction: -1, Icon: ArrowUpIcon },
  { key: 'tiltDown', axis: 'x', direction: 1, Icon: ArrowDownIcon },
  { key: 'turnLeft', axis: 'y', direction: 1, Icon: ArrowCounterclockwiseIcon },
  { key: 'turnRight', axis: 'y', direction: -1, Icon: ArrowClockwiseIcon },
  { key: 'rollLeft', axis: 'z', direction: 1, Icon: ArrowLeftIcon },
  { key: 'rollRight', axis: 'z', direction: -1, Icon: ArrowRightIcon },
];

const AXES: (keyof WeaponPose)[] = ['rx', 'ry', 'rz'];

/**
 * The standard pose and the grip point of a library weapon (083, US1), under the editable stage: six buttons that turn the
 * weapon by exactly 90° about the stage's axes (the coarse part), three 1° sliders — one per Euler axis — for the fine
 * turn, the current angles, and "Pega no meio" for the grip point, which is picked by clicking the model. The aim is the
 * tip along the green arrow ("cima"), the edge along the red one ("direita") and the outer face along the blue one.
 */
export const WeaponPoseFields = ({ pose, gripPoint, onPose, onGripPoint, disabled = false }: WeaponPoseFieldsProps) => {
  const { t } = useTranslation();

  return (
    <fieldset className="stm-weapon-pose" disabled={disabled}>
      <legend className="form-label small mb-1">{t('weapons.pose.title')}</legend>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
        <div className="btn-group btn-group-sm" role="group" aria-label={t('weapons.pose.title')}>
          {TURNS.map(({ key, axis, direction, Icon }) => (
            <button key={key} type="button" className="btn btn-outline-secondary" title={t(`weapons.pose.${key}`)}
              aria-label={t(`weapons.pose.${key}`)} onClick={() => onPose(turnPose(pose, axis, direction))}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <span className="small text-secondary">{t('weapons.pose.angles', { rx: pose.rx, ry: pose.ry, rz: pose.rz })}</span>
      </div>
      <div className="stm-weapon-pose-fine mb-1">
        {AXES.map((axis) => {
          const id = `weapon-pose-${axis}`;
          const value = signedDegrees(pose[axis]);
          return (
            <div key={axis} className="mb-1">
              <label htmlFor={id} className="form-label small mb-0 d-flex justify-content-between">
                <span>{t(`weapons.pose.axis.${axis}`)}</span>
                <output htmlFor={id} className="fw-semibold">{`${value}°`}</output>
              </label>
              <input
                id={id}
                type="range"
                className="form-range"
                min={-180}
                max={180}
                step={1}
                value={value}
                aria-valuetext={`${value}°`}
                onChange={(event) => onPose(normalizePose({ ...pose, [axis]: Number(event.target.value) }))}
              />
            </div>
          );
        })}
      </div>
      <div className="d-flex justify-content-between align-items-center gap-2">
        <div className="form-text mt-0">{t('weapons.pose.hint')}</div>
        <button type="button" className="btn btn-link btn-sm p-0 flex-shrink-0" disabled={isDefaultGripPoint(gripPoint)}
          onClick={() => onGripPoint(DEFAULT_GRIP_POINT)}>
          {t('weapons.pose.gripCenter')}
        </button>
      </div>
      <div className="form-text mt-0">
        <span className="stm-weapon-legend stm-weapon-legend-up" aria-hidden="true" /> {t('weapons.pose.legendUp')}
        {' · '}
        <span className="stm-weapon-legend stm-weapon-legend-right" aria-hidden="true" /> {t('weapons.pose.legendRight')}
        {' · '}
        <span className="stm-weapon-legend stm-weapon-legend-front" aria-hidden="true" /> {t('weapons.pose.legendFront')}
        {' · '}
        <span className="stm-weapon-legend stm-weapon-legend-grip" aria-hidden="true" /> {t('weapons.pose.legendGrip')}
      </div>
    </fieldset>
  );
};

export default WeaponPoseFields;
