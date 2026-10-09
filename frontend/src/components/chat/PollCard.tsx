import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CheckIcon } from '../ui/icons';
import { PollVotesModal } from './PollVotesModal';
import { useChat } from '../../hooks/useChat';
import { myVote, percent } from '../../lib/chatPoll';
import type { ChatItemInfo } from '../../types/chat';

/** At most this many voter pictures beside an option, like WhatsApp. */
const MAX_AVATARS = 3;

/**
 * A poll in the chat (045), like WhatsApp's: the question, "Escolha uma opção", each option with a radio (filled on the
 * option the current speaker voted), the count, a bar of its share and up to three voters, and "Ver votos". Tapping an
 * option votes there; tapping the voted one withdraws the vote.
 */
export const PollCard = ({ item }: { item: ChatItemInfo }) => {
  const { t } = useTranslation();
  const { speaker, vote } = useChat();
  const [showVotes, setShowVotes] = useState(false);
  const poll = item.poll;
  if (!poll) return null;
  const mine = speaker ? myVote(poll, speaker.characterId) : null;

  const tap = async (optionId: number) => {
    if (!speaker) {
      toast.info(t('chat.poll.chooseCharacter'));
      return;
    }
    try {
      await vote(item, optionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="stm-poll">
      <div className="stm-poll-question">{poll.question}</div>
      <div className="stm-poll-hint">{t('chat.poll.chooseOne')}</div>
      <div role="radiogroup" aria-label={poll.question}>
        {poll.options.map((option) => {
          const checked = option.optionId === mine;
          return (
            <button key={option.optionId} type="button" role="radio" aria-checked={checked}
              className={`stm-poll-option${checked ? ' is-mine' : ''}`} disabled={item.deleted}
              aria-label={t('chat.poll.vote', { option: option.text })}
              onClick={(event) => { event.stopPropagation(); void tap(option.optionId); }}>
              <span className="stm-poll-row">
                <span className="stm-poll-radio" aria-hidden="true">{checked && <CheckIcon size={12} />}</span>
                <span className="stm-poll-text">{option.text}</span>
                {option.voters.length > 0 && (
                  <span className="stm-poll-voters" aria-hidden="true">
                    {option.voters.slice(0, MAX_AVATARS).map((voter) => (
                      <CharacterAvatar key={voter.characterId ?? 'master'}
                        name={voter.characterId === null ? t('chat.poll.master') : voter.name} imageUrl={voter.imageUrl} size={18} />
                    ))}
                  </span>
                )}
                <span className="stm-poll-count">{option.votes}</span>
              </span>
              <span className="stm-poll-bar" aria-hidden="true">
                <span style={{ width: `${percent(option.votes, poll.totalVotes)}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="stm-poll-footer" onClick={(event) => { event.stopPropagation(); setShowVotes(true); }}>
        {t('chat.poll.seeVotes')}
      </button>
      <PollVotesModal poll={showVotes ? poll : null} onClose={() => setShowVotes(false)} />
    </div>
  );
};

export default PollCard;
