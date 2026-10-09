import { useCallback, useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { useTurn } from '../../hooks/useTurn';
import { INBOX_EVENT } from '../../Contexts/RealtimeContext';
import { pushService } from '../../Services/pushService';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import type { UserNotificationInfo } from '../../types/push';
import { BellIcon, FlagIcon } from '../ui/icons';

interface NotificationBellProps {
  /** Opens the summary of a finished turn (016). */
  onOpenTurn: (turnNo: number) => void;
}

/** The inbox is also reloaded this often while the tab is visible (realtime covers the rest). */
const INBOX_POLL_MS = 60_000;

const timeOf = (iso: string) => {
  // Backend dates are UTC without a zone.
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/**
 * Bell right of the user name: pending campaign invites with accept / decline (FR-018/019), the finished turns of the
 * current campaign, which open the turn summary (016), and every notice the user received — exactly as the Web Push
 * carried it (title, text, link to the campaign's chat), newest first. Opening the bell marks them as read.
 */
export const NotificationBell = ({ onOpenTurn }: NotificationBellProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { invites, refreshInvites, acceptInvite, declineInvite } = useCharacter();
  const { notifications: turns, dismiss } = useTurn();
  const [inbox, setInbox] = useState<UserNotificationInfo[]>([]);
  const [unread, setUnread] = useState(0);
  const count = invites.length + turns.length + unread;
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadInbox = useCallback(async () => {
    if (!session) return;
    try {
      const page = await pushService.inbox();
      setInbox(page.items);
      setUnread(page.unreadCount);
    } catch {
      // The bell stays as it was; next poll or event tries again.
    }
  }, [session]);

  // On login, on every new notice (realtime) and now and then while visible.
  useEffect(() => {
    if (!session) {
      setInbox([]);
      setUnread(0);
      return;
    }
    void loadInbox();
    const onInbox = () => { void loadInbox(); };
    window.addEventListener(INBOX_EVENT, onInbox);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadInbox();
    }, INBOX_POLL_MS);
    return () => {
      window.removeEventListener(INBOX_EVENT, onInbox);
      window.clearInterval(timer);
    };
  }, [session, loadInbox]);

  const onOpenChange = (open: boolean) => {
    if (!open) return;
    void refreshInvites();
    // Seen: the badge clears, the items keep their "não lida" mark until the next reload.
    if (unread > 0) {
      setUnread(0);
      void pushService.markInboxRead(null).catch(() => undefined);
    }
  };

  const openNotice = (notice: UserNotificationInfo) => {
    setInbox((list) => list.map((n) => (n.userNotificationId === notice.userNotificationId ? { ...n, read: true } : n)));
    if (!notice.read) void pushService.markInboxRead(notice.userNotificationId).catch(() => undefined);
    if (notice.url) navigate(notice.url);
  };

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

  const empty = invites.length === 0 && turns.length === 0 && inbox.length === 0;

  return (
    <DropdownMenu.Root modal={false} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="btn btn-sm btn-outline-secondary stm-bell" aria-label={t('notifications.label')}>
          <BellIcon />
          {count > 0 && <span className="badge rounded-pill text-bg-danger">{count > 99 ? '99+' : count}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu stm-notifications p-0" align="end" sideOffset={4}>
          {invites.map((invite) => {
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
          {inbox.map((notice) => (
            <DropdownMenu.Item
              key={`inbox-${notice.userNotificationId}`}
              className={`dropdown-item stm-notification stm-inbox-notification${notice.read ? '' : ' is-unread'}`}
              onSelect={() => openNotice(notice)}
            >
              <img src="/brand/icon-192.png" alt="" width={28} height={28} className="stm-inbox-icon" />
              <span className="stm-inbox-text">
                <span className="stm-inbox-head">
                  <strong>{notice.title}</strong>
                  <time className="text-body-secondary">{timeOf(notice.createdAt)}</time>
                </span>
                <span className="stm-inbox-body">{notice.body}</span>
              </span>
              {!notice.read && <span className="stm-inbox-dot" aria-label={t('notifications.unread')} />}
            </DropdownMenu.Item>
          ))}
          {empty && (
            <DropdownMenu.Label className="dropdown-item-text text-body-secondary py-2">{t('notifications.empty')}</DropdownMenu.Label>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default NotificationBell;
