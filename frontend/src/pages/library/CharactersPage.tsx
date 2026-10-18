import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CharacterAvatar } from '../../components/ui/CharacterAvatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TransferCharacterModal } from '../../components/modals/TransferCharacterModal';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { PencilIcon, TransferIcon } from '../../components/ui/icons';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { participationAction } from '../../lib/characterSelection';
import { isPlayable } from '../../lib/campaignStatus';
import { characterPath } from '../../lib/libraryRoutes';
import type { CharacterInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * "Personagens" of the library (087; was "Selecionar personagem"): only the user's own characters, each with its
 * status in the current campaign and the action for it (request access, accept/decline an invite, use it), the pencil
 * to its page and "Transferir".
 */
export const CharactersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    myCharacters, myParticipations, currentSelection, loading, refresh, select, requestAccess, acceptInvite, declineInvite,
  } = useCharacter();
  const { currentCampaign } = useCampaign();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [transferring, setTransferring] = useState<CharacterInfo | null>(null);
  // 049: characters join only an active campaign (the server refuses it too).
  const joinBlocked = !isPlayable(currentCampaign?.status);
  const joinTitle = joinBlocked ? t('campaignStatus.blockedJoin') : undefined;

  useEffect(() => { void refresh(); }, [refresh]);

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
  };

  const renderActions = (character: CharacterInfo) => {
    if (!currentCampaign) return null;
    const participation = participationOf(character.characterId);
    const busy = busyId === character.characterId;
    switch (participationAction(participation?.status)) {
      case 'request':
        return <button type="button" className="btn btn-sm btn-primary" disabled={busy || joinBlocked} title={joinTitle} onClick={() => onRequest(character)}>{t('selectCharacter.request')}</button>;
      case 'respondInvite':
        return (
          <>
            <button type="button" className="btn btn-sm btn-success" disabled={busy || joinBlocked} title={joinTitle} onClick={() => onAccept(character, participation!.campaignCharacterId)}>{t('selectCharacter.accept')}</button>
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
    <section>
      <LibraryPageHeader title={t('library.nav.characters')}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(characterPath('new'))}>{t('character.include')}</button>} />
      {currentCampaign && <p className="text-body-secondary small">{t('library.characters.statusIn', { campaign: currentCampaign.name })}</p>}
      {myCharacters.length === 0 ? (
        <p className="text-body-secondary">{loading ? t('common.loading') : t('selectCharacter.empty')}</p>
      ) : (
        <ul className="list-group stm-list">
          {myCharacters.map((character) => (
            <li key={character.characterId} className="list-group-item stm-character-row">
              <CharacterAvatar name={character.name} imageUrl={character.imageUrl} />
              <div className="stm-character-text">
                <Link to={characterPath(character.characterId)} className="fw-semibold text-reset text-decoration-none">{character.name}</Link>
                {currentCampaign && <span><StatusBadge status={participationOf(character.characterId)?.status} /></span>}
              </div>
              <div className="stm-character-actions">
                {renderActions(character)}
                <Link to={characterPath(character.characterId)} className="btn btn-sm btn-outline-secondary"
                  title={t('selectCharacter.edit', { name: character.name })} aria-label={t('selectCharacter.edit', { name: character.name })}>
                  <PencilIcon size={14} />
                </Link>
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyId === character.characterId}
                  title={t('transfer.action')} aria-label={t('transfer.action')} onClick={() => setTransferring(character)}>
                  <TransferIcon size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TransferCharacterModal
        open={transferring !== null}
        onOpenChange={(value) => { if (!value) setTransferring(null); }}
        character={transferring}
      />
    </section>
  );
};

export default CharactersPage;
