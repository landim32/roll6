import { formatTime } from './player';
import type { Player } from './player';

const ICONS = {
  play: 'm11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393',
  pause: 'M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5',
};

/** The parts of the time bar the page owns (`index.html`). */
export interface TimelineElements {
  toggle: HTMLButtonElement;
  range: HTMLInputElement;
  label: HTMLElement;
}

/**
 * The time bar (062, FR-003): play/pause, a range from 0 to the duration and "1,2 s de 3,0 s". It follows the player
 * every frame; dragging pauses and shows the pose of that instant. Disabled without an animation.
 */
export const createTimeline = (elements: TimelineElements, player: () => Player | null) => {
  const { toggle, range, label } = elements;
  let dragging = false;
  let shown: 'play' | 'pause' | null = null;

  /** Bootstrap Icons play-fill / pause-fill, swapped only when the state changes. */
  const showButton = (kind: 'play' | 'pause') => {
    if (shown === kind) return;
    shown = kind;
    toggle.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${ICONS[kind]}"/></svg>`;
    const text = kind === 'play' ? 'Tocar' : 'Pausar';
    toggle.setAttribute('aria-label', text);
    toggle.title = text;
  };

  toggle.addEventListener('click', () => {
    const current = player();
    if (!current) return;
    if (current.playback().paused) current.play();
    else current.pause();
  });
  range.addEventListener('pointerdown', () => { dragging = true; });
  range.addEventListener('pointerup', () => { dragging = false; });
  range.addEventListener('input', () => player()?.seek(Number(range.value)));

  /** Called every frame. */
  const refresh = () => {
    const playback = player()?.playback();
    const enabled = playback?.enabled ?? false;
    toggle.disabled = !enabled;
    range.disabled = !enabled;
    if (!playback || !enabled) {
      range.value = '0';
      label.textContent = '—';
      showButton('play');
      return;
    }
    range.max = String(playback.duration);
    if (!dragging) range.value = String(playback.time);
    label.textContent = `${formatTime(playback.time)} de ${formatTime(playback.duration)}`;
    showButton(playback.paused ? 'play' : 'pause');
  };

  return { refresh };
};
