import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { ConfirmModal } from '../ui/ConfirmModal';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { StatusBadge } from '../ui/StatusBadge';
import { useCharacter } from '../../hooks/useCharacter';
import { inviteAction } from '../../lib/characterSelection';
import type { CharacterSearchInfo } from '../../types/character';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';
import type { CampaignCharacterInfo, CampaignCharacterStatus } from '../../types/campaignCharacter';
import type { PagedList } from '../../types/common';

interface ManageCharactersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Master only: characters in the campaign (approve / deny / remove) and the invite search. */
export const ManageCharactersModal = ({ open, onOpenChange }: ManageCharactersModalProps) => {
  const { t } = useTranslation();
  const { listCampaignCharacters, approve, deny, remove, invite, searchCharacters } = useCharacter();
  const [tab, setTab] = useState('campaign');
  const [members, setMembers] = useState<CampaignCharacterInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<CampaignCharacterInfo | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PagedList<CharacterSearchInfo> | null>(null);
  const [searching, setSearching] = useState(false);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      setMembers(await listCampaignCharacters());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMembersLoading(false);
    }
  }, [listCampaignCharacters]);

  // Both tabs need the campaign list (the invite tab shows each result's status).
  useEffect(() => {
    if (open) void loadMembers();
  }, [open, tab, loadMembers]);

  useEffect(() => {
    if (!open) {
      setTab('campaign');
      setSearch('');
      setPage(1);
      setResults(null);
    }
  }, [open]);

  // Debounced search; a new text goes back to page 1.
  useEffect(() => {
    if (!open || tab !== 'invite') return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchCharacters({ page, pageSize: PAGE_SIZE, search });
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, tab, search, page, searchCharacters]);

  const statusByCharacter = useMemo(
    () => new Map<number, CampaignCharacterStatus>(members.map((m) => [m.characterId, m.status])),
    [members],
  );

  const act = async (id: number, action: () => Promise<void>) => {
    try {
      setBusyId(id);
      await action();
      await loadMembers();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const onApprove = (m: CampaignCharacterInfo) => act(m.campaignCharacterId, async () => {
    await approve(m.campaignCharacterId);
    toast.success(t('toast.requestApproved', { name: m.characterName }));
  });

  const onDeny = (m: CampaignCharacterInfo) => act(m.campaignCharacterId, async () => {
    await deny(m.campaignCharacterId);
    toast.info(t('toast.requestDenied', { name: m.characterName }));
  });

  const onConfirmRemove = async () => {
    if (!toRemove) return;
    try {
      await remove(toRemove.campaignCharacterId);
      toast.success(t('toast.characterRemoved', { name: toRemove.characterName }));
      setToRemove(null);
      await loadMembers();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  };

  const onInvite = (c: CharacterSearchInfo) => act(c.characterId, async () => {
    const result = await invite(c.characterId);
    if (result.status === CAMPAIGN_CHARACTER_STATUS.approved) toast.success(t('toast.requestApproved', { name: c.name }));
    else toast.success(t('toast.characterInvited', { name: c.name }));
  });

  const totalPages = results ? Math.max(1, Math.ceil(results.totalCount / results.pageSize)) : 1;

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={t('manage.title')} large>
        <Tabs
          tabs={[{ key: 'campaign', label: t('manage.campaignTab') }, { key: 'invite', label: t('manage.inviteTab') }]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'campaign' && (
          membersLoading && members.length === 0
            ? <p className="text-body-secondary">{t('common.loading')}</p>
            : members.length === 0
              ? <p className="text-body-secondary">{t('manage.emptyCampaign')}</p>
              : (
                <ul className="list-group stm-list">
                  {members.map((m) => {
                    const busy = busyId === m.campaignCharacterId;
                    return (
                      <li key={m.campaignCharacterId} className="list-group-item stm-character-row">
                        <CharacterAvatar name={m.characterName} imageUrl={m.characterImageUrl} />
                        <div className="stm-character-text">
                          <strong>{m.characterName}</strong>
                          <small className="text-body-secondary">{t('character.owner', { name: m.characterOwnerName })}</small>
                        </div>
                        <div className="stm-character-actions">
                          <StatusBadge status={m.status} />
                          {m.status === CAMPAIGN_CHARACTER_STATUS.requestedAccess && (
                            <>
                              <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => onApprove(m)}>{t('manage.approve')}</button>
                              <button type="button" className="btn btn-sm btn-outline-warning" disabled={busy} onClick={() => onDeny(m)}>{t('manage.deny')}</button>
                            </>
                          )}
                          <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => setToRemove(m)}>{t('manage.remove')}</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
        )}

        {tab === 'invite' && (
          <>
            <input
              type="search"
              className="form-control mb-3"
              placeholder={t('manage.search')}
              aria-label={t('manage.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              autoFocus
            />
            {searching && !results ? <p className="text-body-secondary">{t('common.loading')}</p>
              : !results || results.items.length === 0 ? <p className="text-body-secondary">{t('manage.emptySearch')}</p>
                : (
                  <>
                    <ul className="list-group stm-list">
                      {results.items.map((c) => {
                        const status = statusByCharacter.get(c.characterId);
                        return (
                          <li key={c.characterId} className="list-group-item stm-character-row">
                            <CharacterAvatar name={c.name} imageUrl={c.imageUrl} />
                            <div className="stm-character-text">
                              <strong>{c.name}</strong>
                              <small className="text-body-secondary">{t('character.owner', { name: c.ownerName })}</small>
                            </div>
                            <div className="stm-character-actions">
                              {status !== undefined && status !== CAMPAIGN_CHARACTER_STATUS.denied && <StatusBadge status={status} />}
                              {inviteAction(status) === 'invite' && (
                                <button type="button" className="btn btn-sm btn-primary" disabled={busyId === c.characterId} onClick={() => onInvite(c)}>
                                  {t('manage.invite')}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
                        <small className="text-body-secondary">{page} / {totalPages}</small>
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
                      </div>
                    )}
                  </>
                )}
          </>
        )}
      </Modal>

      <ConfirmModal
        open={toRemove !== null}
        onOpenChange={(o) => { if (!o) setToRemove(null); }}
        title={t('manage.removeTitle')}
        message={toRemove ? t('manage.removeMessage', { name: toRemove.characterName, owner: toRemove.characterOwnerName }) : ''}
        confirmLabel={t('manage.remove')}
        onConfirm={onConfirmRemove}
        danger
      />
    </>
  );
};

export default ManageCharactersModal;
