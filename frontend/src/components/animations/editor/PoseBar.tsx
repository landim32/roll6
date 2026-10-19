import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PlusIcon, TrashIcon } from '../../ui/icons';
import type { AnimationFile } from '../../../lib/animationFormat';
import type { Playback } from './player';
import { poseTimes } from './poses';
import type { PoseInfo } from './poses';
import { insertPoseAfter, movePose, poseTimeBounds, removePose } from './poseList';
import type { PoseChange } from './poseList';

export interface PoseBarHandle {
  /** Called every frame by the stage, like the timeline's; only a change of pose reaches React. */
  refresh: (playback: Playback, pose: PoseInfo | null) => void;
}

interface PoseBarProps {
  content: AnimationFile | null;
  /** Editing blocked (a request running, no editable animation). */
  disabled: boolean;
  handle: React.MutableRefObject<PoseBarHandle | null>;
  /** Shows a pose on the stage (paused there). */
  onSeek: (seconds: number) => void;
  /** A changed file and the instant to show it at. */
  onChange: (change: PoseChange) => void;
}

/** "0,27" — the seconds of a pose, two decimals. */
const seconds = (time: number): string => time.toFixed(2).replace('.', ',');

/**
 * The pose bar over the stage's top-right corner: one chip per key pose (number and instant; the one on screen lit),
 * a click shows it, and the actions on the lit pose — a new pose after it that copies it, its instant, and its
 * removal. The first pose stays at 0 s and cannot be removed. This bar and the Claude are the only ways a pose is
 * created: turning a bone changes the pose it is on.
 */
export const PoseBar = ({ content, disabled, handle, onSeek, onChange }: PoseBarProps) => {
  const { t } = useTranslation();
  const times = useMemo(() => poseTimes(content), [content]);
  const [current, setCurrent] = useState<number | null>(null);
  const shown = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handle.current = {
      refresh: (playback, pose) => {
        const index = playback.enabled && pose && pose.from === pose.to ? pose.from - 1 : null;
        if (index === shown.current) return;
        shown.current = index;
        setCurrent(index);
      },
    };
    return () => { handle.current = null; };
  }, [handle]);

  const time = current !== null && current < times.length ? times[current] : null;
  const bounds = content && time !== null ? poseTimeBounds(content, time) : null;
  const number = current !== null ? current + 1 : null;
  const first = current === 0;
  const canAct = !disabled && !!content && time !== null;

  const apply = (change: PoseChange | null, failure: string) => {
    if (!change) {
      toast.error(failure);
      return;
    }
    onChange(change);
  };

  const add = () => {
    if (!content || time === null) return;
    apply(insertPoseAfter(content, time), t('editor.poses.noRoom'));
  };

  const remove = () => {
    if (!content || time === null) return;
    apply(removePose(content, time), t('editor.poses.removeFirst'));
  };

  const commitTime = () => {
    const field = input.current;
    if (!field || !content || time === null || !bounds) return;
    const value = Number(field.value.replace(',', '.'));
    if (Math.abs(value - time) < 0.005) return;
    const change = movePose(content, time, value);
    if (!change) {
      toast.error(t('editor.poses.badTime', { min: seconds(bounds.min), max: seconds(bounds.max) }));
      field.value = seconds(time).replace(',', '.');
      return;
    }
    onChange(change);
  };

  return (
    <div className="stm-editor-poses" role="group" aria-label={t('editor.poses.label')}>
      <span className="stm-editor-poses-title">{t('editor.poses.label')}</span>
      <div className="stm-editor-poses-list">
        {times.map((pose, index) => (
          <button key={index} type="button" className={`stm-editor-pose-chip${index === current ? ' is-current' : ''}`}
            onClick={() => onSeek(pose)} title={t('editor.poses.goTo', { n: index + 1, time: seconds(pose) })}
            aria-pressed={index === current}>
            <span className="stm-editor-pose-no">{index + 1}</span>
            <span className="stm-editor-pose-at">{seconds(pose)}</span>
          </button>
        ))}
        {times.length === 0 && <span className="text-body-secondary small">{t('editor.poses.none')}</span>}
      </div>
      <div className="input-group input-group-sm stm-editor-poses-actions">
        <button type="button" className="btn btn-outline-secondary" disabled={!canAct} onClick={add}
          title={number === null ? t('editor.poses.pickOne') : t('editor.poses.add', { n: number })}
          aria-label={number === null ? t('editor.poses.pickOne') : t('editor.poses.add', { n: number })}>
          <PlusIcon size={14} />
        </button>
        <input ref={input} key={`${current}-${time}`} type="number" className="form-control stm-editor-pose-input"
          defaultValue={time === null ? '' : seconds(time).replace(',', '.')} step={0.01}
          min={bounds?.min} max={bounds?.max} disabled={!canAct || first}
          aria-label={number === null ? t('editor.poses.pickOne') : t('editor.poses.time', { n: number })}
          title={first ? t('editor.poses.firstFixed') : number === null ? t('editor.poses.pickOne') : t('editor.poses.time', { n: number })}
          onBlur={commitTime}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTime();
            } else if (event.key === 'Escape' && time !== null) {
              event.currentTarget.value = seconds(time).replace(',', '.');
              event.currentTarget.blur();
            }
          }} />
        <span className="input-group-text">s</span>
        <button type="button" className="btn btn-outline-secondary" disabled={!canAct || first} onClick={remove}
          title={first ? t('editor.poses.removeFirst') : number === null ? t('editor.poses.pickOne') : t('editor.poses.remove', { n: number })}
          aria-label={first ? t('editor.poses.removeFirst') : number === null ? t('editor.poses.pickOne') : t('editor.poses.remove', { n: number })}>
          <TrashIcon size={14} />
        </button>
      </div>
    </div>
  );
};

export default PoseBar;
