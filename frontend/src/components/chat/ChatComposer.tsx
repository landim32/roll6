import { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AudioRecorder } from './AudioRecorder';
import { ImageIcon, SendIcon } from '../ui/icons';
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
  const { speaker, send } = useChat();
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
        await act(piece.mapTokenId, value);
        setText('');
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

  const onPickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
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

  return (
    <div className="stm-chat-composer">
      {participation && (
        <div className="btn-group btn-group-sm stm-chat-mode" role="group" aria-label={t('chat.modeLabel')}>
          <button type="button" className={`btn ${mode === 'talk' ? 'btn-primary' : 'btn-outline-secondary'}`}
            aria-pressed={mode === 'talk'} onClick={() => setMode('talk')}>
            {t('chat.modeTalk')}
          </button>
          <button type="button" className={`btn ${mode === 'act' ? 'btn-primary' : 'btn-outline-secondary'}`}
            aria-pressed={mode === 'act'} onClick={() => setMode('act')} disabled={!piece}
            title={piece ? t('chat.modeActHint') : t('chat.placeToAct')}>
            {t('chat.modeAct')}
          </button>
        </div>
      )}
      <div className="stm-chat-input">
        {!recording && (
          <>
            <textarea className="form-control form-control-sm" rows={1} maxLength={max} value={text}
              placeholder={acting ? t('chat.actPlaceholder') : t('chat.placeholder', { name: participation?.characterName ?? t('chat.master') })}
              aria-label={acting ? t('chat.actPlaceholder') : t('chat.messageLabel')}
              onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} disabled={busy} />
            {!acting && (
              <>
                <input ref={fileRef} type="file" accept={IMAGE_TYPES} className="d-none" onChange={(e) => { void onPickImage(e); }} />
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => fileRef.current?.click()} disabled={busy}
                  title={t('chat.sendImage')} aria-label={t('chat.sendImage')}>
                  <ImageIcon size={14} />
                </button>
              </>
            )}
          </>
        )}
        {!acting && recordable && <AudioRecorder disabled={busy} onSend={onSendAudio} onActiveChange={onRecordingChange} />}
        {!recording && (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { void submit(); }}
            disabled={busy || !text.trim() || (acting && !piece)}
            title={acting ? t('chat.sendAction') : t('chat.send')} aria-label={acting ? t('chat.sendAction') : t('chat.send')}>
            <SendIcon size={14} />
          </button>
        )}
      </div>
      {text.length > max * 0.8 && <div className="form-text text-end m-0">{text.length}/{max}</div>}
    </div>
  );
};

export default ChatComposer;
