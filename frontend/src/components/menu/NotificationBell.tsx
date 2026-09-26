import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { useCharacter } from '../../hooks/useCharacter';
import { useTurn } from '../../hooks/useTurn';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
  </svg>
);

interface NotificationBellProps {
  /** Opens the summary of a finished turn (016). */
  onOpenTurn: (turnNo: number) => void;
}

const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12 12 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A20 20 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a20 20 0 0 0 1.349-.476l.019-.007.004-.002h.001" />
  </svg>
);

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
