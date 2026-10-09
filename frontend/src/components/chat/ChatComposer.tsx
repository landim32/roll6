import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AudioRecorder } from './AudioRecorder';
import { ReplyQuote } from './ReplyQuote';
import { pickClipboardImage } from '../../lib/clipboardImage';
import { replyExcerpt } from '../../lib/chatItems';
import { Dice5Icon, EyeIcon, EyeSlashIcon, HandIndexIcon, ImageIcon, ReplyIcon, LightningIcon, PaperclipIcon, SendIcon } from '../ui/icons';
import { useChat } from '../../hooks/useChat';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import { chatService } from '../../Services/chatService';
import { imageService } from '../../Services/imageService';
import { audioExtension, canRecord } from '../../lib/audioFormat';

/** Longest message (backend Turn.MAX_TEXT) and action (Turn.MAX_DESCRIPTION). */
const MAX_TEXT = 4000;
const MAX_ACTION = 2000;
/** Photos the API takes (same limit as the other uploads). */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = 'image/png,image/jpeg,image/webp';

type ComposerMode = 'talk' | 'act';

/**
 * Where the user writes (041): as the chosen approved character, or as the master. With a character, "Ação" records
 * the turn's action of its piece on the open map instead of a message; photos and recordings are always conversation.
 */
export const ChatComposer = () => {
  const { t } = useTranslation();
  const { speaker, send, roll, poke, filters, setFilters, replyTo, cancelReply } = useChat();
  const [pasted, setPasted] = useState<{ file: File; url: string } | null>(null);
  const { mapTokens } = useMapToken();
  const { act } = useTurn();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ComposerMode>('talk');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recordable = useMemo(canRecord, []);

  const participation = speaker?.participation ?? null;
  const piece = participation
    ? mapTokens.find((p) => p.campaignCharacterId === participation.campaignCharacterId) ?? null
    : null;
  const acting = mode === 'act' && !!participation;
  const max = acting ? MAX_ACTION : MAX_TEXT;
  const disabled = !speaker;

  const submit = async () => {
    const value = text.trim();
    if (!value || busy || disabled) return;
    if (acting) {
      if (!piece) return;
      try {
        setBusy(true);
        await act(piece.mapTokenId, value, replyTo?.turnId ?? null);
        cancelReply();
        setText('');
        // Back to talking, like closing an attachment.
        setMode('talk');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      } finally {
        setBusy(false);
      }
      return;
    }
    // The text leaves the field at once; a failure stays at the bottom of the list with "tentar de novo".
    setText('');
    await send({ text: value }, value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  /** A photo with the field's text as caption — from the clip or pasted (044). */
  const sendPhoto = async (file: File) => {
    if (!IMAGE_TYPES.split(',').includes(file.type)) {
      toast.error(t('chat.imageType'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('chat.imageTooLarge'));
      return;
    }
    const caption = text.trim() || null;
    try {
      setBusy(true);
      const uploaded = await imageService.upload(file);
      setText('');
      await send({ image: uploaded.fileName, text: caption }, caption ?? t('chat.image'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await sendPhoto(file);
  };

  /** Ctrl+V / colar of a picture (044): a preview with Enviar/Cancelar; plain text pastes as usual. */
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pick = pickClipboardImage(event.clipboardData.items);
    if (!pick.file && !pick.unsupported) return;
    event.preventDefault();
    if (!pick.file) {
      toast.error(t('chat.imageType'));
      return;
    }
    if (pick.extra > 0) toast.info(t('chat.pasteOnlyFirst'));
    setPasted((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { file: pick.file!, url: URL.createObjectURL(pick.file!) };
    });
  };

  const clearPasted = () => setPasted((current) => {
    if (current) URL.revokeObjectURL(current.url);
    return null;
  });

  const sendPasted = async () => {
    const file = pasted?.file;
    clearPasted();
    if (file) await sendPhoto(file);
  };

  const onSendAudio = async (blob: Blob, type: string, seconds: number) => {
    try {
      const uploaded = await chatService.uploadAudio(blob, `audio.${audioExtension(type)}`);
      await send({ audio: uploaded.fileName, audioSeconds: seconds }, t('chat.audio'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      throw err;
    }
  };

  const onRecordingChange = useCallback((active: boolean) => setRecording(active), []);

  if (disabled) {
    return <div className="stm-chat-composer text-body-secondary small">{t('chat.chooseCharacter')}</div>;
  }

  const pickImage = () => fileRef.current?.click();

  /** Pokes everyone who hasn't acted in the turn (043): they get a notification, the chat a gray line. */
  const onPoke = async () => {
    try {
      const result = await poke();
      if (result.poked === 0) toast.info(t('chat.pokeNobody'));
      else toast.success(t('chat.pokeDone', { count: result.poked }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  /** 3d6 drawn by the server; whatever is typed becomes the roll's reason ("Ataque com espada"). */
  const onRoll = async () => {
    const reason = text.trim() || null;
    try {
      setBusy(true);
      await roll(reason);
      setText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };
  // Like WhatsApp: an empty field offers the microphone, anything typed (or an action) offers "send".
  const showRecorder = recordable && !acting && (recording || !text.trim());

  return (
    <div className="stm-chat-composer">
      {replyTo && (
        <div className="stm-chat-reply-card">
          <ReplyIcon size={16} />
          <ReplyQuote reply={{
            key: replyTo.key, turnId: replyTo.turnId, displayName: replyTo.displayName, kind: replyTo.kind,
            excerpt: replyExcerpt(replyTo), deleted: replyTo.deleted, cancelled: !!replyTo.cancelled,
          }} />
          <button type="button" className="btn-close" onClick={cancelReply} aria-label={t('chat.cancelReply')} title={t('chat.cancelReply')} />
        </div>
      )}
      {pasted && (
        <div className="stm-chat-paste">
          <img src={pasted.url} alt={t('chat.image')} />
          <div className="stm-chat-paste-actions">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearPasted}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { void sendPasted(); }} disabled={busy}>{t('chat.send')}</button>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept={IMAGE_TYPES} className="d-none" onChange={(e) => { void onPickImage(e); }} />
      <div className="stm-chat-input">
        {!recording && (
          <div className={`stm-chat-field${acting ? ' is-acting' : ''}`}>
            <textarea rows={1} maxLength={max} value={text}
              placeholder={acting ? t('chat.actPlaceholder') : t('chat.placeholder', { name: participation?.characterName ?? t('chat.master') })}
              aria-label={acting ? t('chat.actPlaceholder') : t('chat.messageLabel')}
              onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} onPaste={onPaste} disabled={busy} />
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger className="stm-chat-field-btn" disabled={busy} title={t('chat.attach')} aria-label={t('chat.attach')}>
                <PaperclipIcon size={22} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                {/* WhatsApp-like attach sheet: two columns of big round icons, sized for a finger. */}
                <DropdownMenu.Content className="stm-chat-attach" side="top" align="end" sideOffset={10}>
                  {!acting && (
                    <>
                      <DropdownMenu.Item className="stm-chat-attach-item" onSelect={() => { void onRoll(); }}>
                        <span className="stm-chat-attach-icon is-roll"><Dice5Icon size={24} /></span>
                        <span>{t('chat.rollOption')}</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="stm-chat-attach-item" onSelect={() => { void onPoke(); }}>
                        <span className="stm-chat-attach-icon is-poke"><HandIndexIcon size={24} /></span>
                        <span>{t('chat.pokeOption')}</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="stm-chat-attach-item" onSelect={pickImage}>
                        <span className="stm-chat-attach-icon is-photo"><ImageIcon size={24} /></span>
                        <span>{t('chat.photoOption')}</span>
                      </DropdownMenu.Item>
                    </>
                  )}
                  {/* What this user sees in the chat: the item stays open so both can be switched in one go. */}
                  <DropdownMenu.Item className={`stm-chat-attach-item${filters.showMovement ? ' is-on' : ''}`}
                    onSelect={(event) => { event.preventDefault(); setFilters({ ...filters, showMovement: !filters.showMovement }); }}
                    aria-checked={filters.showMovement} role="menuitemcheckbox">
                    <span className="stm-chat-attach-icon is-view">
                      {filters.showMovement ? <EyeIcon size={24} /> : <EyeSlashIcon size={24} />}
                    </span>
                    <span>{t('chat.showMovement')}</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={`stm-chat-attach-item${filters.showChanges ? ' is-on' : ''}`}
                    onSelect={(event) => { event.preventDefault(); setFilters({ ...filters, showChanges: !filters.showChanges }); }}
                    aria-checked={filters.showChanges} role="menuitemcheckbox">
                    <span className="stm-chat-attach-icon is-view">
                      {filters.showChanges ? <EyeIcon size={24} /> : <EyeSlashIcon size={24} />}
                    </span>
                    <span>{t('chat.showChanges')}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {participation && (
              // The action switch: on, the field turns red and sending records the turn's action; off, a message.
              <button type="button" className={`stm-chat-field-btn stm-chat-act-switch${acting ? ' is-on' : ''}`}
                role="switch" aria-checked={acting} disabled={busy || (!acting && !piece)}
                onClick={() => setMode(acting ? 'talk' : 'act')}
                title={!piece && !acting ? t('chat.placeToAct') : t(acting ? 'chat.actOff' : 'chat.actOn')}
                aria-label={t('chat.actSwitch')}>
                <LightningIcon size={22} />
              </button>
            )}
          </div>
        )}
        {showRecorder ? (
          <AudioRecorder disabled={busy} onSend={onSendAudio} onActiveChange={onRecordingChange} />
        ) : (
          <button type="button" className={`btn ${acting ? 'btn-danger' : 'btn-primary'} stm-chat-send`} onClick={() => { void submit(); }}
            disabled={busy || !text.trim() || (acting && !piece)}
            title={acting ? t('chat.sendAction') : t('chat.send')} aria-label={acting ? t('chat.sendAction') : t('chat.send')}>
            {acting ? <LightningIcon size={22} /> : <SendIcon size={22} />}
          </button>
        )}
      </div>
      {text.length > max * 0.8 && <div className="form-text text-end m-0">{text.length}/{max}</div>}
    </div>
  );
};

export default ChatComposer;
