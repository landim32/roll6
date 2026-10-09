import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MicIcon, SendIcon, StopIcon, TrashIcon } from '../ui/icons';
import { MAX_RECORDING_SECONDS, formatSeconds, pickAudioType } from '../../lib/audioFormat';

interface AudioRecorderProps {
  disabled: boolean;
  /** Sends the recording; resolves when it was handed to the chat. */
  onSend: (blob: Blob, type: string, seconds: number) => Promise<void>;
  /** Tells the composer a recording is open (it hides the text field meanwhile). */
  onActiveChange: (active: boolean) => void;
}

interface Recorded {
  blob: Blob;
  type: string;
  seconds: number;
  url: string;
}

/**
 * Voice message (041): tap to record (the microphone is asked on that tap), stops by itself at 2 minutes, then listen,
 * send or discard.
 */
export const AudioRecorder = ({ disabled, onSend, onActiveChange }: AudioRecorderProps) => {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const [sending, setSending] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const stopTracks = () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  };

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    stopTracks();
  }, []);

  useEffect(() => () => {
    if (recorded) URL.revokeObjectURL(recorded.url);
  }, [recorded]);

  useEffect(() => {
    onActiveChange(recording || recorded !== null);
  }, [recording, recorded, onActiveChange]);

  const stop = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const start = async () => {
    const type = pickAudioType((candidate) => MediaRecorder.isTypeSupported(candidate));
    if (!type) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(t('chat.micDenied'), { description: t('chat.micDeniedHint') });
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType: type });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onstop = () => {
      stopTracks();
      setRecording(false);
      const seconds = Math.min(MAX_RECORDING_SECONDS, Math.max(1, Math.round((Date.now() - startedRef.current) / 1000)));
      const blob = new Blob(chunks, { type: recorder.mimeType || type });
      if (blob.size > 0) setRecorded({ blob, type: recorder.mimeType || type, seconds, url: URL.createObjectURL(blob) });
    };
    recorderRef.current = recorder;
    startedRef.current = Date.now();
    setElapsed(0);
    recorder.start();
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      const seconds = (Date.now() - startedRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) stop();
    }, 250);
  };

  const send = async () => {
    if (!recorded) return;
    try {
      setSending(true);
      await onSend(recorded.blob, recorded.type, recorded.seconds);
      setRecorded(null);
    } finally {
      setSending(false);
    }
  };

  if (recording) {
    return (
      <div className="stm-chat-recorder">
        <span className="stm-chat-rec-dot" aria-hidden="true" />
        <span className="small">{formatSeconds(elapsed)} / {formatSeconds(MAX_RECORDING_SECONDS)}</span>
        <button type="button" className="btn btn-danger ms-auto stm-chat-send" onClick={stop}
          title={t('chat.stopRecording')} aria-label={t('chat.stopRecording')}>
          <StopIcon size={20} />
        </button>
      </div>
    );
  }

  if (recorded) {
    return (
      <div className="stm-chat-recorder">
        <audio controls src={recorded.url} preload="metadata" />
        <button type="button" className="btn btn-outline-secondary ms-auto stm-chat-send" onClick={() => setRecorded(null)} disabled={sending}
          title={t('chat.discardRecording')} aria-label={t('chat.discardRecording')}>
          <TrashIcon size={20} />
        </button>
        <button type="button" className="btn btn-primary stm-chat-send" onClick={() => { void send(); }} disabled={sending}
          title={t('chat.send')} aria-label={t('chat.send')}>
          <SendIcon size={20} />
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="btn btn-primary stm-chat-send" onClick={() => { void start(); }} disabled={disabled}
      title={t('chat.record')} aria-label={t('chat.record')}>
      <MicIcon size={22} />
    </button>
  );
};

export default AudioRecorder;
