import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { useCharacter } from '../../hooks/useCharacter';
import { useChat } from '../../hooks/useChat';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import { hexCenter } from '../../lib/hexGrid';
import { LAYOUT_MODE } from '../../lib/layoutMode';
import { TURN_STATUS, characterStatus } from '../../lib/turnStatus';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

/** Same zoom as opening a map on the chosen character. */
const FOCUS_ZOOM = 1.5;

/**
 * Floating over the top of the chat: the round pictures of the characters that still owe their play this turn — red
 * border when they neither moved nor acted, yellow when they only moved — blinking slowly. A tap goes to the map, on
 * that character's piece.
 */
export const PendingPlayers = () => {
  const { t } = useTranslation();
  const { party } = useCharacter();
  const { turnNo, entries } = useTurn();
  const { mapTokens } = useMapToken();
  const { draft, hexSize, centerOn } = useMapEditor();
  const { layoutMode, setLayoutMode } = useChat();

  const pending = useMemo(() => (turnNo === null ? [] : party
    .map((member) => ({ member, status: characterStatus(entries, member.characterId) }))
    .filter(({ status }) => status !== TURN_STATUS.acted)), [turnNo, party, entries]);

  if (pending.length === 0) return null;

  const goTo = (member: CampaignCharacterInfo) => {
    const piece = draft.mapId === null ? undefined
      : mapTokens.find((token) => token.mapId === draft.mapId && token.campaignCharacterId === member.campaignCharacterId);
    if (!piece) {
      toast.info(t('chat.pendingNotOnMap', { name: member.characterName }));
      return;
    }
    if (layoutMode === LAYOUT_MODE.chat) setLayoutMode(LAYOUT_MODE.map);
    const center = hexCenter(piece.x, piece.y, hexSize);
    // After the map region is on screen, so the piece lands in the middle of it.
    window.requestAnimationFrame(() => centerOn(center.x, center.y, FOCUS_ZOOM));
  };

  return (
    <div className="stm-chat-pending" role="list" aria-label={t('chat.pendingLabel')}>
      {pending.map(({ member, status }) => {
        const label = t(status === TURN_STATUS.moved ? 'chat.pendingMoved' : 'chat.pendingNone', { name: member.characterName });
        return (
          <button key={member.campaignCharacterId} type="button" role="listitem" title={label} aria-label={label}
            className={`stm-chat-pending-item is-${status}`} onClick={() => goTo(member)}>
            <CharacterAvatar name={member.characterName} imageUrl={member.characterImageUrl} size={40} />
          </button>
        );
      })}
    </div>
  );
};

export default PendingPlayers;
