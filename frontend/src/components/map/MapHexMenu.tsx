import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import type { MapInteraction } from '../../hooks/useMapInteraction';
import { canMove, canSetPosture, canTakeTurn, isOwnPiece } from '../../lib/mapInteraction';
import { repeatedActionOf } from '../../lib/repeatedAction';
import { hasEntries } from '../../lib/turnStatus';
import { HexMenu } from './HexMenu';
import { MovementCounter } from './MovementCounter';

interface MapHexMenuProps {
  interaction: MapInteraction;
}

/**
 * The hex menu of a view of the map and the "Mover" counter (015), built from `useMapInteraction` — the same options
 * for the 2D map and the isometric view (105). The menu is placed at the spot the view gave with the click.
 */
export const MapHexMenu = ({ interaction }: MapHexMenuProps) => {
  const { t } = useTranslation();
  const { setPosture } = useMapToken();
  const { entries: turnEntries } = useTurn();
  const { props, ctx, menu, menuToken, movement, overlay, closeMenu, setPickedHex, startTargeting } = interaction;
  const { onPickToken, onDeleteToken, onEditNpc, onAct, onRepeated, onResetTurn } = props;
  const actor = menuToken && {
    mapTokenId: menuToken.mapTokenId, name: menuToken.name, characterId: menuToken.characterId, mapNpcId: menuToken.mapNpcId,
  };
  const takesTurn = !!menuToken && canTakeTurn(menuToken, ctx);

  return (
    <>
      {overlay?.counted && (
        <MovementCounter spent={movement.state.phase === 'idle' ? null : movement.state.cost}
          total={movement.state.phase === 'idle' ? 0 : movement.state.piece.total ?? 0} status={overlay.status} />
      )}
      {menu && (
        <HexMenu
          left={menu.left}
          top={menu.top}
          token={menuToken ? { name: menuToken.name, imageUrl: menuToken.upImageUrl } : null}
          canManage={ctx.canPlace}
          onEditNpc={menuToken && menuToken.mapNpcId !== null && (ctx.canPlace || isOwnPiece(menuToken, ctx)) ? () => onEditNpc(menuToken) : undefined}
          deleteLabel={menuToken && menuToken.mapNpcId !== null ? t('hexMenu.removeNpc') : undefined}
          onMove={menuToken && canMove(menuToken, ctx) ? () => movement.start(menuToken) : undefined}
          onAct={takesTurn && actor ? () => onAct(actor) : undefined}
          onActOn={takesTurn && actor ? () => startTargeting(actor) : undefined}
          onRepeated={takesTurn && actor && menuToken
            ? () => onRepeated({ ...actor, current: repeatedActionOf(menuToken) }) : undefined}
          repeatedActive={repeatedActionOf(menuToken) !== null}
          onResetTurn={takesTurn && menuToken && hasEntries(turnEntries, menuToken)
            ? () => onResetTurn({ mapTokenId: menuToken.mapTokenId, name: menuToken.name }) : undefined}
          posture={menuToken?.posture ?? null}
          onPosture={menuToken && canSetPosture(menuToken, ctx)
            ? (posture) => setPosture(menuToken.mapTokenId, posture).catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message : t('common.unknownError'));
            })
            : undefined}
          onClose={closeMenu}
          onAdd={() => {
            setPickedHex(menu.hex);
            onPickToken({ kind: 'add', x: menu.hex.x, y: menu.hex.y });
          }}
          onChange={() => {
            if (!menuToken) return;
            setPickedHex(menu.hex);
            onPickToken({ kind: 'change', mapTokenId: menuToken.mapTokenId, name: menuToken.name });
          }}
          onDelete={() => {
            if (!menuToken) return;
            setPickedHex(menu.hex);
            onDeleteToken({ mapTokenId: menuToken.mapTokenId, name: menuToken.name, mapNpcId: menuToken.mapNpcId });
          }}
        />
      )}
    </>
  );
};

export default MapHexMenu;
