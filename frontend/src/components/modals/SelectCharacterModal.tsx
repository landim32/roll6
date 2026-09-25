import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { StatusBadge } from '../ui/StatusBadge';
import { useCharacter } from '../../hooks/useCharacter';
import { participationAction } from '../../lib/characterSelection';
import type { CharacterInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';

interface SelectCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens "Incluir Personagem" (empty state). */
  onInclude: () => void;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** The user's characters with their status in the current campaign and the action for each (FR-013/014). */
export const SelectCharacterModal = ({ open, onOpenChange, onInclude }: SelectCharacterModalProps) => {
  const { t } = useTranslation();
  const {
    myCharacters, myParticipations, currentSelection, loading, refresh, select, requestAccess, acceptInvite, declineInvite,
  } = useCharacter();
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const participationOf = (characterId: number) => myParticipations.find((p) => p.characterId === characterId);

  const act = async (character: CharacterInfo, action: () => Promise<void>) => {
    try {
      setBusyId(character.characterId);
      await action();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const onRequest = (character: CharacterInfo) => act(character, async () => {
    const result = await requestAccess(character.characterId);
    if (result.status === CAMPAIGN_CHARACTER_STATUS.approved) toast.success(t('toast.accessApproved', { name: character.name }));
    else toast.success(t('toast.accessRequested', { name: character.name }));
  });

  const onAccept = (character: CharacterInfo, id: number) => act(character, async () => {
    const result = await acceptInvite(id);
    toast.success(t('toast.inviteAccepted', { name: character.name, campaign: result.campaignName }));
  });

  const onDecline = (character: CharacterInfo, id: number) => act(character, async () => {
    await declineInvite(id);
    toast.info(t('toast.inviteDeclined'));
  });

  const onUse = (character: CharacterInfo) => {
    select(character.characterId);
    toast.info(t('toast.characterSelected', { name: character.name }));
    onOpenChange(false);
  };

  const renderActions = (character: CharacterInfo) => {
    const participation = participationOf(character.characterId);
    const busy = busyId === character.characterId;
    switch (participationAction(participation?.status)) {
      case 'request':
        return <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => onRequest(character)}>{t('selectCharacter.request')}</button>;
      case 'respondInvite':
        return (
          <>
            <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => onAccept(character, participation!.campaignCharacterId)}>{t('selectCharacter.accept')}</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => onDecline(character, participation!.campaignCharacterId)}>{t('selectCharacter.decline')}</button>
          </>
        );
      case 'waiting':
        return <small className="text-body-secondary">{t('selectCharacter.waiting')}</small>;
      case 'waitInvite':
        return <small className="text-body-secondary">{t('selectCharacter.waitInvite')}</small>;
      case 'use':
        return currentSelection === character.characterId
          ? <small className="text-body-secondary">{t('selectCharacter.current')}</small>
          : <button type="button" className="btn btn-sm btn-primary" onClick={() => onUse(character)}>{t('selectCharacter.use')}</button>;
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('selectCharacter.title')} large>
      {myCharacters.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-body-secondary">{loading ? t('common.loading') : t('selectCharacter.empty')}</p>
          {!loading && (
            <button type="button" className="btn btn-primary" onClick={() => { onOpenChange(false); onInclude(); }}>
              {t('character.include')}
            </button>
          )}
        </div>
      ) : (
        <ul className="list-group stm-list">
          {myCharacters.map((character) => (
            <li key={character.characterId} className="list-group-item stm-character-row">
              <CharacterAvatar name={character.name} imageUrl={character.imageUrl} />
              <div className="stm-character-text">
                <strong>{character.name}</strong>
                <span><StatusBadge status={participationOf(character.characterId)?.status} /></span>
              </div>
              <div className="stm-character-actions">{renderActions(character)}</div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default SelectCharacterModal;
