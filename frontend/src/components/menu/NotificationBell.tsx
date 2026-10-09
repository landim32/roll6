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
import { buildFeed, hasUnread, unreadCount } from '../../lib/notificationFeed';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import type { UserNotificationInfo } from '../../types/push';
import { BellIcon, CheckAllIcon, FlagIcon } from '../ui/icons';

interface NotificationBellProps {
  /** Opens the summary of a finished turn (016). */
  onOpenTurn: (turnNo: number) => void;
}

/** The inbox is also reloaded this often while the tab is visible (realtime covers the rest). */
const INBOX_POLL_MS = 60_000;

/** "HH:mm" today, "dd/MM" before. */
const timeOf = (at: number | null): string | null => {
  if (at === null) return null;
  const date = new Date(at);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/**
 * Bell right of the user name (046): one list, newest first, of the pending campaign invites (accept / decline), the
 * finished turns of the current campaign (open the turn summary) and every notice received, exactly as the Web Push
 * carried it. "Marcar tudo como lido" heads the list; opening the bell marks nothing, opening an item marks that item.
 */
export const NotificationBell = ({ onOpenTurn }: NotificationBellProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { invites, refreshInvites, acceptInvite, declineInvite } = useCharacter();
  const { notifications: turns, markRead: markTurnRead, markAllRead: markAllTurnsRead } = useTurn();
  const [inbox, setInbox] = useState<UserNotificationInfo[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadInbox = useCallback(async () => {
    if (!session) return;
    try {
      setInbox((await pushService.inbox()).items);
    } catch {
      // The bell stays as it was; next poll or event tries again.
    }
  }, [session]);

  // On login, on every new notice (realtime) and now and then while visible.
  useEffect(() => {
    if (!session) {
      setInbox([]);
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

  const feed = buildFeed(invites, turns, inbox);
  const count = unreadCount(feed);
  const canMarkAll = hasUnread(feed);

  const onOpenChange = (open: boolean) => {
    if (open) void refreshInvites();
  };

  const markAll = async () => {
    const before = inbox;
    // Optimistic: dots and badge go at once; the received notices come back if the server refuses.
    setInbox((list) => list.map((n) => ({ ...n, read: true })));
    markAllTurnsRead();
    try {
      await pushService.markInboxRead(null);
    } catch {
      setInbox(before);
      toast.error(t('notifications.markAllFailed'));
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
          {feed.length === 0 ? (
            <DropdownMenu.Label className="dropdown-item-text text-body-secondary py-2">{t('notifications.empty')}</DropdownMenu.Label>
          ) : (
            // preventDefault keeps the menu open: the list is still shown, now read.
            <DropdownMenu.Item className="dropdown-item stm-feed-markall" disabled={!canMarkAll}
              onSelect={(e) => { e.preventDefault(); void markAll(); }}>
              <CheckAllIcon size={18} />
              <span>{t('notifications.markAllRead')}</span>
            </DropdownMenu.Item>
          )}
          {feed.map((item) => {
            const time = timeOf(item.at);
            if (item.kind === 'invite') {
              const { invite } = item;
              const busy = busyId === invite.campaignCharacterId;
              return (
                <DropdownMenu.Group key={item.key} className="stm-notification">
                  <div className="stm-character-row mb-2">
                    <CharacterAvatar name={invite.characterName} imageUrl={invite.characterImageUrl} size={28} />
                    <small className="stm-character-text" style={{ whiteSpace: 'normal' }}>
                      {t('notifications.invite', { campaign: invite.campaignName, owner: invite.campaignOwnerName, character: invite.characterName })}
                      {time && <time className="text-body-secondary ms-1">· {time}</time>}
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
            }
            if (item.kind === 'turn') {
              const { turn } = item;
              return (
                <DropdownMenu.Item key={item.key}
                  className={`dropdown-item stm-notification stm-turn-notification${turn.read ? '' : ' is-unread'}`}
                  onSelect={() => {
                    markTurnRead(turn.turnNo);
                    onOpenTurn(turn.turnNo);
                  }}>
                  <FlagIcon />
                  <span className="stm-inbox-text">
                    <span className="stm-inbox-head">
                      <strong>{t('notifications.turnFinished', { no: turn.turnNo })}</strong>
                      {time && <time className="text-body-secondary">{time}</time>}
                    </span>
                    <small className="text-body-secondary">{t('notifications.turnFinishedHint')}</small>
                  </span>
                  {!turn.read && <span className="stm-inbox-dot" aria-label={t('notifications.unread')} />}
                </DropdownMenu.Item>
              );
            }
            const { notice } = item;
            return (
              <DropdownMenu.Item key={item.key}
                className={`dropdown-item stm-notification stm-inbox-notification${notice.read ? '' : ' is-unread'}`}
                onSelect={() => openNotice(notice)}>
                <img src="/brand/icon-192.png" alt="" width={28} height={28} className="stm-inbox-icon" />
                <span className="stm-inbox-text">
                  <span className="stm-inbox-head">
                    <strong>{notice.title}</strong>
                    {time && <time className="text-body-secondary">{time}</time>}
                  </span>
                  <span className="stm-inbox-body">{notice.body}</span>
                </span>
                {!notice.read && <span className="stm-inbox-dot" aria-label={t('notifications.unread')} />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default NotificationBell;
