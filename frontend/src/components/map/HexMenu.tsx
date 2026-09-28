import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { MoveIcon, PlusIcon, SpeechIcon, SwapIcon, TrashIcon, UndoIcon } from '../ui/icons';

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
          <MoveIcon size={18} />
        </button>
      )}
      {token && onAct && (
        <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus={!onMove} onClick={choose(onAct)}>
          <span>{t('hexMenu.act')}</span>
          <SpeechIcon size={18} />
        </button>
      )}
      {token && onResetTurn && (
        <button type="button" className="stm-float-menu-item" role="menuitem" onClick={choose(onResetTurn)}>
          <span>{t('hexMenu.resetTurn')}</span>
          <UndoIcon size={18} />
        </button>
      )}
      {!canManage ? null : token ? (
        <>
          <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus={!onMove && !onAct} onClick={choose(onChange)}>
            <span>{t('hexMenu.changeToken')}</span>
            <SwapIcon size={18} />
          </button>
          <button type="button" className="stm-float-menu-item is-destructive" role="menuitem" onClick={choose(onDelete)}>
            <span>{t('hexMenu.deleteToken')}</span>
            <TrashIcon size={18} />
          </button>
        </>
      ) : (
        <button type="button" className="stm-float-menu-item" role="menuitem" autoFocus onClick={choose(onAdd)}>
          <span>{t('hexMenu.addToken')}</span>
          <PlusIcon size={18} />
        </button>
      )}
    </div>
  );
};

export default HexMenu;
