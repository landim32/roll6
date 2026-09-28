import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useCharacter } from '../../hooks/useCharacter';
import { MAX_EMAIL_LENGTH, normalizeTransferEmail, validateTransferEmail } from '../../lib/transferForm';
import type { CharacterInfo } from '../../types/character';

interface TransferCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Character being transferred (one of the logged user's). */
  character: CharacterInfo | null;
}

/** Hands a character to another user by e-mail (021); campaigns, pieces and turns stay as they are. */
export const TransferCharacterModal = ({ open, onOpenChange, character }: TransferCharacterModalProps) => {
  const { t } = useTranslation();
  const { transferCharacter } = useCharacter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setEmail('');
  }, [open]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!character || sending) return;
    const error = validateTransferEmail(email);
    if (error) {
      toast.error(t(`transfer.errors.${error}`));
      return;
    }
    const target = normalizeTransferEmail(email);
    try {
      setSending(true);
      await transferCharacter(character.characterId, target);
      toast.success(t('toast.characterTransferred', { name: character.name, email: target }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('transfer.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</button>
          <button type="submit" form="transfer-character-form" className="btn btn-danger" disabled={sending || !character}>
            {sending && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {t('transfer.submit')}
          </button>
        </>
      )}
    >
      <form id="transfer-character-form" className="row g-3" onSubmit={onSubmit} noValidate>
        <div className="col-12">
          <p className="mb-0">
            <Trans i18nKey="transfer.description" values={{ name: character?.name ?? '' }} components={{ strong: <strong /> }} />
          </p>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="transfer-email">{t('transfer.email')}</label>
          <input id="transfer-email" type="email" className="form-control" autoFocus autoComplete="off"
            maxLength={MAX_EMAIL_LENGTH} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="col-12">
          <div className="alert alert-warning mb-0" role="alert">{t('transfer.warning')}</div>
        </div>
      </form>
    </Modal>
  );
};

export default TransferCharacterModal;
