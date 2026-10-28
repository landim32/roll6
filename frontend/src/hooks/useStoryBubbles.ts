import { useEffect, useMemo, useState } from 'react';
import type { StoryBubble } from '../components/story/BubbleLayer';
import { nextBalloonExpiry, storyBalloons } from '../lib/chatBubbles';
import { pieceKey } from '../lib/turnStatus';
import type { MapTokenInfo } from '../types/mapToken';
import { useChat } from './useChat';
import { useTurn } from './useTurn';

/**
 * The balloons of the 3D views (036, 068, 073; the isometric view since 103), in any mode, for the given pieces, keyed
 * like the 2D map (`pieceKey`): the action of the turn in progress always shows; what an actor says in the chat (a
 * message, a caption, a roll) takes its place for 60 seconds from when it was sent, while newer than the action. Objects
 * say nothing. `shown` leaves out the pieces the view does not draw.
 */
const EVERY_PIECE = (): boolean => true;

export const useStoryBubbles = (
  pieces: readonly MapTokenInfo[],
  /** A stable rule (a module-level function): it is a dependency of the memo. */
  shown: (piece: MapTokenInfo) => boolean = EVERY_PIECE,
): StoryBubble[] => {
  const { entries } = useTurn();
  const { items: chatItems } = useChat();
  /** The clock of the chat balloons (068): moved forward when one of them expires. */
  const [balloonNow, setBalloonNow] = useState(() => Date.now());

  const bubbles = useMemo((): StoryBubble[] => {
    const texts = storyBalloons(chatItems, entries, balloonNow);
    if (texts.size === 0) return [];
    return pieces.reduce<StoryBubble[]>((list, piece) => {
      if (!shown(piece)) return list;
      const key = pieceKey(piece);
      const text = key ? texts.get(key) : undefined;
      return text ? [...list, { id: piece.mapTokenId, name: piece.name, text }] : list;
    }, []);
  }, [chatItems, balloonNow, entries, pieces, shown]);

  // The clock of the balloons (068): read again when the chat changes and when the next speech to expire is due.
  useEffect(() => {
    setBalloonNow(Date.now());
  }, [chatItems]);
  useEffect(() => {
    const next = nextBalloonExpiry(chatItems, balloonNow);
    if (next === null) return;
    const timer = window.setTimeout(() => setBalloonNow(Date.now()), Math.max(0, next - Date.now()) + 20);
    return () => window.clearTimeout(timer);
  }, [chatItems, balloonNow]);

  return bubbles;
};
