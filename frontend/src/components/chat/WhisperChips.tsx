import { useTranslation } from 'react-i18next';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import type { WhisperRecipient } from '../../lib/whisper';

interface WhisperChipsProps {
  recipients: WhisperRecipient[];
  onRemove: (recipient: WhisperRecipient) => void;
}

/** "Sussurrando para" + the chosen recipients over the yellow field (047); × takes one out, the last ends the whisper. */
export const WhisperChips = ({ recipients, onRemove }: WhisperChipsProps) => {
  const { t } = useTranslation();
  if (recipients.length === 0) return null;
  return (
    <div className="stm-whisper-chips">
      <span className="stm-whisper-chips-label">{t('chat.whisper.to')}</span>
      {recipients.map((recipient) => (
        <span key={recipient.characterId ?? 'master'} className="stm-whisper-chip">
          <CharacterAvatar name={recipient.name} imageUrl={recipient.imageUrl} size={20} />
          <span>{recipient.name}</span>
          <button type="button" className="btn-close btn-close-white" onClick={() => onRemove(recipient)}
            aria-label={t('chat.whisper.remove', { name: recipient.name })} title={t('chat.whisper.remove', { name: recipient.name })} />
        </span>
      ))}
    </div>
  );
};

export default WhisperChips;
