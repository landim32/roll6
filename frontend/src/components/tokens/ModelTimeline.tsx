import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { PauseFillIcon, PlayFillIcon } from '../ui/icons';
import type { ModelPreviewHandle } from './ModelPreview';

interface ModelTimelineProps {
  preview: RefObject<ModelPreviewHandle | null>;
  /** The model is loading or failed: nothing to drive. */
  disabled: boolean;
  /** Changes whenever the preview starts another animation (state, choice or file): the bar starts again, playing. */
  resetKey: string;
  /** Paused or playing, for the controls that need a still pose (057: "Gerar imagem"). */
  onStillChange?: (still: boolean) => void;
}

/** Steps of the bar per animation, for the arrow keys and the drag. */
const STEPS = 200;

const seconds = (value: number): string => value.toFixed(1).replace('.', ',');

/**
 * The timeline of the 3D model preview (057): how far into its animation the model is, a button to pause and resume,
 * and a bar to drag (or click, or move with the arrows) to any point of the animation, which then stays paused there.
 * The bar is a native range input, so touch, mouse, keyboard and screen readers work as everywhere; while playing it is
 * moved straight in the DOM on every frame, without a React render.
 */
export const ModelTimeline = ({ preview, disabled, resetKey, onStillChange }: ModelTimelineProps) => {
  const { t } = useTranslation();
  const range = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);
  const [paused, setPaused] = useState(false);
  const [hasAnimation, setHasAnimation] = useState(false);
  const onStill = useRef(onStillChange);
  onStill.current = onStillChange;

  // A new animation starts from the beginning, playing (FR-008).
  useEffect(() => {
    scrubbing.current = false;
    setPaused(false);
  }, [resetKey]);

  // The bar follows the animation; React only hears when paused/playing or "has an animation" changes.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const input = range.current;
      const playback = preview.current?.playback();
      if (!input || !playback) return;
      setHasAnimation(playback.hasAnimation);
      setPaused(playback.paused);
      if (!playback.hasAnimation) return;
      const max = String(playback.duration);
      if (input.max !== max) {
        input.max = max;
        input.step = String(playback.duration / STEPS);
      }
      if (!scrubbing.current) input.value = String(playback.time);
      input.setAttribute('aria-valuetext', t('tokens.model.timeline.value', {
        time: seconds(Number(input.value)), total: seconds(playback.duration),
      }));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [preview, t]);

  const still = paused || !hasAnimation;
  useEffect(() => {
    onStill.current?.(still);
  }, [still]);

  const toggle = useCallback(() => {
    const handle = preview.current;
    if (!handle) return;
    if (handle.playback().paused) handle.play();
    else handle.pause();
    setPaused(handle.playback().paused);
  }, [preview]);

  const startScrub = () => {
    scrubbing.current = true;
    preview.current?.pause();
    setPaused(true);
  };
  const endScrub = () => {
    scrubbing.current = false;
  };

  const off = disabled || !hasAnimation;
  return (
    <div className="stm-model-timeline">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={toggle}
        disabled={off}
        title={t(paused ? 'tokens.model.timeline.play' : 'tokens.model.timeline.pause')}
        aria-label={t(paused ? 'tokens.model.timeline.play' : 'tokens.model.timeline.pause')}
      >
        {paused ? <PlayFillIcon /> : <PauseFillIcon />}
      </button>
      <input
        ref={range}
        type="range"
        className="form-range"
        min={0}
        defaultValue={0}
        disabled={off}
        aria-label={t('tokens.model.timeline.label')}
        onPointerDown={startScrub}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onKeyDown={() => { if (!paused) { preview.current?.pause(); setPaused(true); } }}
        onInput={(event) => preview.current?.seek(Number(event.currentTarget.value))}
      />
    </div>
  );
};

export default ModelTimeline;
