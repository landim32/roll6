import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { votesByRank } from '../../lib/chatPoll';
import type { ChatPollInfo } from '../../types/chat';

interface PollVotesModalProps {
  poll: ChatPollInfo | null;
  onClose: () => void;
}

/** "Ver votos" (045): each option, the most voted first, with how many voted and who (votes are public). */
export const PollVotesModal = ({ poll, onClose }: PollVotesModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal open={poll !== null} onOpenChange={(o) => { if (!o) onClose(); }} title={t('chat.poll.votesTitle')}>
      {poll && (
        <>
          <p className="fw-semibold">{poll.question}</p>
          {votesByRank(poll).map((option) => (
            <div key={option.optionId} className="stm-poll-votes-option">
              <div className="d-flex justify-content-between gap-2">
                <strong className="text-break">{option.text}</strong>
                <small className="text-body-secondary text-nowrap">{t('chat.poll.votes', { count: option.votes })}</small>
              </div>
              {option.voters.length === 0
                ? <small className="text-body-secondary">{t('chat.poll.noVotes')}</small>
                : option.voters.map((voter) => (
                  <div key={voter.characterId ?? 'master'} className="stm-poll-votes-voter">
                    <CharacterAvatar name={voter.name} imageUrl={voter.imageUrl} size={28} />
                    <span>{voter.characterId === null ? t('chat.poll.master') : voter.name}</span>
                  </div>
                ))}
            </div>
          ))}
        </>
      )}
    </Modal>
  );
};

export default PollVotesModal;
