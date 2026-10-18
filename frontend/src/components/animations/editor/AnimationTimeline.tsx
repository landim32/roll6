import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PauseFillIcon, PlayFillIcon } from '../../ui/icons';
import { formatTime } from './player';
import type { Playback } from './player';
import { poseLabel } from './poses';
import type { PoseInfo } from './poses';

export interface TimelineHandle {
  /** Called every frame by the stage; writes straight to the DOM (no React render per frame). */
  refresh: (playback: Playback, pose: PoseInfo | null) => void;
}

interface AnimationTimelineProps {
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  /** The handle the stage's frame loop feeds. */
  handle: React.MutableRefObject<TimelineHandle | null>;
}

/**
 * The time bar of the editor (086; the roll6anime `timeline.ts` of 062): play/pause, a range from 0 to the duration,
 * "1,2 s de 3,0 s" and the key pose ("Pose 2 de 5"). Dragging pauses and shows the pose of that instant.
 */
export const AnimationTimeline = ({ onPlay, onPause, onSeek, handle }: AnimationTimelineProps) => {
  const { t } = useTranslation();
  const toggle = useRef<HTMLButtonElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const pose = useRef<HTMLSpanElement>(null);
  const playIcon = useRef<HTMLSpanElement>(null);
  const pauseIcon = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const paused = useRef(true);

  // Disabled until the stage reports a playback — set on the DOM, never as a JSX prop: React drops the clicks of a
  // button whose props say `disabled`, even after `refresh` enables the element (the pause button did nothing).
  useEffect(() => {
    if (toggle.current) toggle.current.disabled = true;
    if (range.current) range.current.disabled = true;
  }, []);

  useEffect(() => {
    handle.current = {
      refresh: (playback, poseInfo) => {
        const enabled = playback.enabled;
        if (toggle.current) toggle.current.disabled = !enabled;
        if (range.current) {
          range.current.disabled = !enabled;
          if (enabled) {
            range.current.max = String(playback.duration);
            if (!dragging.current) range.current.value = String(playback.time);
          } else range.current.value = '0';
        }
        if (time.current) time.current.textContent = enabled ? `${formatTime(playback.time)} ${t('editor.timeline.of')} ${formatTime(playback.duration)}` : '—';
        if (pose.current) {
          const text = poseInfo ? poseLabel(poseInfo) : '';
          if (pose.current.textContent !== text) pose.current.textContent = text;
        }
        paused.current = playback.paused;
        if (playIcon.current) playIcon.current.hidden = !playback.paused;
        if (pauseIcon.current) pauseIcon.current.hidden = playback.paused;
        if (toggle.current) {
          const label = t(playback.paused ? 'editor.timeline.play' : 'editor.timeline.pause');
          if (toggle.current.title !== label) {
            toggle.current.title = label;
            toggle.current.setAttribute('aria-label', label);
          }
        }
      },
    };
    return () => { handle.current = null; };
  }, [handle, t]);

  return (
    <div className="stm-editor-timeline">
      <button ref={toggle} type="button" className="btn btn-primary btn-sm stm-editor-toggle"
        title={t('editor.timeline.play')} aria-label={t('editor.timeline.play')}
        onClick={() => (paused.current ? onPlay() : onPause())}>
        <span ref={playIcon}><PlayFillIcon size={14} /></span>
        <span ref={pauseIcon} hidden><PauseFillIcon size={14} /></span>
      </button>
      <input ref={range} type="range" className="form-range" min={0} max={1} step={0.01} defaultValue={0}
        aria-label={t('editor.timeline.progress')}
        onPointerDown={() => { dragging.current = true; }}
        onPointerUp={() => { dragging.current = false; }}
        onChange={(event) => onSeek(Number(event.target.value))} />
      <span ref={time} className="stm-editor-time">—</span>
      <span ref={pose} className="stm-editor-pose" aria-live="off" />
    </div>
  );
};

export default AnimationTimeline;
