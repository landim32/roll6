import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { useCharacter } from '../../hooks/useCharacter';
import { useTurn } from '../../hooks/useTurn';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import { BellIcon, FlagIcon } from '../ui/icons';

interface NotificationBellProps {
  /** Opens the summary of a finished turn (016). */
  onOpenTurn: (turnNo: number) => void;
}

/**
 * Bell right of the user name: pending campaign invites with accept / decline (FR-018/019) and the finished
 * turns of the current campaign, which open the turn summary (016).
 */
export const NotificationBell = ({ onOpenTurn }: NotificationBellProps) => {
  const { t } = useTranslation();
  const { invites, refreshInvites, acceptInvite, declineInvite } = useCharacter();
  const { notifications: turns, dismiss } = useTurn();
  const count = invites.length + turns.length;
  const [busyId, setBusyId] = useState<number | null>(null);

  const act = async (invite: CampaignCharacterInfo, accept: boolean) => {
    try {
      setBusyId(invite.campaignCharacterId);
      if (accept) {
        await acceptInvite(invite.campaignCharacterId);
        toast.success(t('toast.inviteAccepted', { name: invite.characterName, campaign: invite.campaignName }));
      } else {
        await declineInvite(invite.campaignCharacterId);
        toast.info(t('toast.inviteDeclined'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DropdownMenu.Root modal={false} onOpenChange={(open) => { if (open) void refreshInvites(); }}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="btn btn-sm btn-outline-secondary stm-bell" aria-label={t('notifications.label')}>
          <BellIcon />
          {count > 0 && <span className="badge rounded-pill text-bg-danger">{count}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu stm-notifications p-0" align="end" sideOffset={4}>
          {turns.map((turn) => (
            <DropdownMenu.Item
              key={`turn-${turn.turnNo}`}
              className="dropdown-item stm-notification stm-turn-notification"
              onSelect={() => {
                dismiss(turn.turnNo);
                onOpenTurn(turn.turnNo);
              }}
            >
              <FlagIcon />
              <span className="d-flex flex-column">
                <span>{t('notifications.turnFinished', { no: turn.turnNo })}</span>
                <small className="text-body-secondary">{t('notifications.turnFinishedHint')}</small>
              </span>
            </DropdownMenu.Item>
          ))}
          {count === 0 ? (
            <DropdownMenu.Label className="dropdown-item-text text-body-secondary py-2">{t('notifications.empty')}</DropdownMenu.Label>
          ) : invites.map((invite) => {
            const busy = busyId === invite.campaignCharacterId;
            return (
              <DropdownMenu.Group key={invite.campaignCharacterId} className="stm-notification">
                <div className="stm-character-row mb-2">
                  <CharacterAvatar name={invite.characterName} imageUrl={invite.characterImageUrl} size={28} />
                  <small className="stm-character-text" style={{ whiteSpace: 'normal' }}>
                    {t('notifications.invite', { campaign: invite.campaignName, owner: invite.campaignOwnerName, character: invite.characterName })}
                  </small>
                </div>
                <div className="d-flex gap-2 justify-content-end">
                  {/* preventDefault keeps the menu open while answering several invites. */}
                  <DropdownMenu.Item asChild disabled={busy} onSelect={(e) => { e.preventDefault(); void act(invite, true); }}>
                    <button type="button" className="btn btn-sm btn-success">{t('notifications.accept')}</button>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild disabled={busy} onSelect={(e) => { e.preventDefault(); void act(invite, false); }}>
                    <button type="button" className="btn btn-sm btn-outline-secondary">{t('notifications.decline')}</button>
                  </DropdownMenu.Item>
                </div>
              </DropdownMenu.Group>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default NotificationBell;
