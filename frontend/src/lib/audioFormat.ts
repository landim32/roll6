/**
 * Recording format for the chat (041): the first one this browser can record — WebM/Opus on Chrome and Android,
 * MP4/AAC on Safari and iOS, Ogg on Firefox — and the file extension the server expects.
 */

export const AUDIO_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'] as const;

export const MAX_RECORDING_SECONDS = 120;

export const pickAudioType = (isTypeSupported: (type: string) => boolean): string | null =>
  AUDIO_CANDIDATES.find((type) => isTypeSupported(type)) ?? null;

export const audioExtension = (type: string): string => {
  if (type.startsWith('audio/mp4')) return 'mp4';
  if (type.startsWith('audio/ogg')) return 'ogg';
  return 'webm';
};

/** "1:05" */
export const formatSeconds = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Whether this browser can record at all (no MediaRecorder → the chat shows no microphone). */
export const canRecord = (): boolean => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'
  && !!navigator.mediaDevices?.getUserMedia && pickAudioType((t) => MediaRecorder.isTypeSupported(t)) !== null;
