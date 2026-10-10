import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import type { WhisperRecipient } from '../../lib/whisper';

interface MentionListProps {
  options: WhisperRecipient[];
  active: number;
  onPick: (recipient: WhisperRecipient) => void;
  onHover: (index: number) => void;
}

/**
 * The "@" list over the chat field (047): who the message can be whispered to. Keyboard (↑ ↓ Enter Tab Esc) is handled
 * by the field, which keeps the focus; a tap or click picks.
 */
export const MentionList = ({ options, active, onPick, onHover }: MentionListProps) => {
  const { t } = useTranslation();
  return (
    <div className="stm-mention-list" role="listbox" aria-label={t('chat.whisper.listLabel')}>
      {options.length === 0 ? (
        <div className="stm-mention-empty">{t('chat.whisper.noMatch')}</div>
      ) : options.map((option, index) => (
        <button key={option.characterId ?? 'master'} type="button" role="option" aria-selected={index === active}
          className={`stm-mention-option${index === active ? ' is-active' : ''}`}
          // Picking on pointer down keeps the field focused (no blur before the choice).
          onPointerDown={(event) => { event.preventDefault(); onPick(option); }}
          onMouseEnter={() => onHover(index)}>
          <CharacterAvatar name={option.name} imageUrl={option.imageUrl} size={28} />
          <span>{option.name}</span>
        </button>
      ))}
    </div>
  );
};

export default MentionList;
