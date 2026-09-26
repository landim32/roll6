import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';

interface HexMenuProps {
  /** Click position relative to the map container (px). */
  left: number;
  top: number;
  /** Piece on the hex, when there is one: shown in the header and the action becomes "Alterar token". */
  token?: { name: string; imageUrl: string | null } | null;
  onAdd: () => void;
  onChange: () => void;
  /** Opens the delete confirmation (hex with a piece). */
  onDelete: () => void;
  /** Starts the "Mover" mode on the piece (015); absent when the user can't move it (or it already moved this turn). */
  onMove?: () => void;
  /** "Agir" (016): records an action of the piece's character/NPC; absent for objects or others' pieces. */
  onAct?: () => void;
  /** "Resetar turno" (016): only when the piece has entries in the turn in progress. */
  onResetTurn?: () => void;
  /** Master: add/change/delete tokens. Players only get "Mover" on their own characters. */
  canManage?: boolean;
  onClose: () => void;
}

/** Gap between the click point and the menu (px). */
const OFFSET = 10;
/** Minimum distance from the container edges (px). */
const MARGIN = 8;

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2" />
  </svg>
);

const SwapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M11.53 1.47a.75.75 0 0 0-1.06 1.06l1.22 1.22H4.5A2.75 2.75 0 0 0 1.75 6.5v.75a.75.75 0 0 0 1.5 0V6.5c0-.69.56-1.25 1.25-1.25h7.19l-1.22 1.22a.75.75 0 1 0 1.06 1.06l2.5-2.5a.75.75 0 0 0 0-1.06zM4.47 14.53a.75.75 0 0 0 1.06-1.06l-1.22-1.22h7.19a2.75 2.75 0 0 0 2.75-2.75v-.75a.75.75 0 0 0-1.5 0v.75c0 .69-.56 1.25-1.25 1.25H4.31l1.22-1.22a.75.75 0 1 0-1.06-1.06l-2.5 2.5a.75.75 0 0 0 0 1.06z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3zM11 3V1.75A1.75 1.75 0 0 0 9.25 0h-2.5A1.75 1.75 0 0 0 5 1.75V3H2.75a.75.75 0 0 0 0 1.5h.3l.8 9.12A1.75 1.75 0 0 0 5.6 15.2h4.8a1.75 1.75 0 0 0 1.74-1.58l.8-9.12h.31a.75.75 0 0 0 0-1.5zm-6.44 1.5h6.88l-.79 8.98a.25.25 0 0 1-.25.22H5.6a.25.25 0 0 1-.25-.22z" />
  </svg>
);

const SpeechIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z" />
    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466" />
  </svg>
);

const MoveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 .5a.5.5 0 0 1 .35.15l2 2a.5.5 0 0 1-.7.7L8.5 2.21V7.5h5.29l-1.14-1.15a.5.5 0 0 1 .7-.7l2 2a.5.5 0 0 1 0 .7l-2 2a.5.5 0 0 1-.7-.7l1.14-1.15H8.5v5.29l1.15-1.14a.5.5 0 0 1 .7.7l-2 2a.5.5 0 0 1-.7 0l-2-2a.5.5 0 0 1 .7-.7l1.15 1.14V8.5H2.21l1.14 1.15a.5.5 0 0 1-.7.7l-2-2a.5.5 0 0 1 0-.7l2-2a.5.5 0 1 1 .7.7L2.21 7.5H7.5V2.21L6.35 3.35a.5.5 0 1 1-.7-.7l2-2A.5.5 0 0 1 8 .5" />
  </svg>
);

/**
 * Floating menu next to a clicked hex, in the style of an iOS context menu: translucent blurred panel,
 * rounded corners, large touch rows with the icon on the right, springing out of the click point.
 * Stays inside the map; closes on outside click, Esc or after choosing. Players only get the turn items
 * (Mover, Agir, Resetar turno) of their own characters.
 */
export const HexMenu = ({
  left, top, token = null, onAdd, onChange, onDelete, onMove, onAct, onResetTurn, canManage = true, onClose,
}: HexMenuProps) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; origin: string } | null>(null);

  // Open below-right of the click; flip to the other side when it would leave the map.
  useLayoutEffect(() => {
    const menu = ref.current;
    const container = menu?.offsetParent as HTMLElement | null;
    if (!menu || !container) return;
    const { width, height } = menu.getBoundingClientRect();
    const flipX = left + OFFSET + width > container.clientWidth - MARGIN;
    const flipY = top + OFFSET + height > container.clientHeight - MARGIN;
    const x = flipX ? left - OFFSET - width : left + OFFSET;
    const y = flipY ? top - OFFSET - height : top + OFFSET;
    setPlace({
      left: Math.max(MARGIN, x),
      top: Math.max(MARGIN, y),
      origin: `${flipY ? 'bottom' : 'top'} ${flipX ? 'right' : 'left'}`,
    });
  }, [left, top]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const choose = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <div
      ref={ref}
      className={`stm-float-menu${place ? ' is-open' : ''}`}
      style={place ? { left: place.left, top: place.top, transformOrigin: place.origin } : { left, top, visibility: 'hidden' }}
      role="menu"
      aria-label={token ? token.name : t('hexMenu.emptyHex')}
    >
      {token && (
        <div className="stm-float-menu-header">
          <CharacterAvatar name={token.name} imageUrl={token.imageUrl} size={32} />
          <span className="stm-float-menu-title" title={token.name}>{token.name}</span>
        </div>
      )}
      {token && onMove && (
        <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus onClick={choose(onMove)}>
          <span>{t('hexMenu.move')}</span>
          <MoveIcon />
        </button>
      )}
      {token && onAct && (
        <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus={!onMove} onClick={choose(onAct)}>
          <span>{t('hexMenu.act')}</span>
          <SpeechIcon />
        </button>
      )}
      {token && onResetTurn && (
        <button type="button" className="stm-float-menu-item" role="menuitem" onClick={choose(onResetTurn)}>
          <span>{t('hexMenu.resetTurn')}</span>
          <UndoIcon />
        </button>
      )}
      {!canManage ? null : token ? (
        <>
          <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus={!onMove && !onAct} onClick={choose(onChange)}>
            <span>{t('hexMenu.changeToken')}</span>
            <SwapIcon />
          </button>
          <button type="button" className="stm-float-menu-item is-destructive" role="menuitem" onClick={choose(onDelete)}>
            <span>{t('hexMenu.deleteToken')}</span>
            <TrashIcon />
          </button>
        </>
      ) : (
        <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus onClick={choose(onAdd)}>
          <span>{t('hexMenu.addToken')}</span>
          <PlusIcon />
        </button>
      )}
    </div>
  );
};

export default HexMenu;
