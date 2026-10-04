import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface VirtualJoystickProps {
  /** Push direction in −1..1 (x right, y down = backwards). */
  onChange: (x: number, y: number) => void;
}

/** Radius (px) of the knob's travel. */
const RANGE = 40;

/** Touch joystick of the 3D view (033), bottom-left: shown on phones and touch screens (CSS). */
export const VirtualJoystick = ({ onChange }: VirtualJoystickProps) => {
  const { t } = useTranslation();
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    const length = Math.hypot(dx, dy);
    const scale = length > RANGE ? RANGE / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    onChange(x / RANGE, y / RANGE);
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    origin.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      className="stm-joystick"
      role="application"
      aria-label={t('story.joystick')}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const rect = event.currentTarget.getBoundingClientRect();
        origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span className="stm-joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
};

export default VirtualJoystick;
