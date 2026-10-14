import { useCallback, useEffect, useState } from 'react';
import { modelService } from '../Services/modelService';
import { AUTO_CLIPS, parseClipChoice } from '../lib/modelAnimations';
import type { AnimationState, ModelClipChoice, ModelClipChoices } from '../lib/modelAnimations';
import type { ResolvedModel } from '../lib/tokenForm';
import type { TokenInfo } from '../types/token';

/** The "3D" tab of the token form (055): a newly picked `.glb`, or the saved model kept or removed, and its animations (056, the death since 058). */
export interface ModelFileState {
  /** The file picked now (checked, not uploaded yet). */
  picked: File | null;
  /** What the preview shows: the picked file (as a blob URL) or the saved model while it is kept; null = none. */
  previewUrl: string | null;
  /** The saved model is still kept (it is sent back on save). */
  keepsSaved: boolean;
  /** The preview could not open the picked file: saving is blocked. */
  invalid: boolean;
  /** The animation chosen for each state (null = automatic), saved with the token. */
  clips: ModelClipChoices;
  pick: (file: File) => void;
  /** Removes the model: the picked file and the saved one. */
  remove: () => void;
  setInvalid: (invalid: boolean) => void;
  setClip: (state: AnimationState, choice: ModelClipChoice) => void;
  /** What to send: uploads the picked file, keeps the saved one, or null — with the chosen animations. */
  resolve: () => Promise<ResolvedModel>;
}

/** A saved choice as the form keeps it: one it does not know (e.g. the former "roll6", 061) is automatic. */
const known = (choice: ModelClipChoice | undefined): ModelClipChoice =>
  (parseClipChoice(choice ?? null).kind === 'auto' ? null : choice ?? null);

const savedClips = (token: TokenInfo | null): ModelClipChoices =>
  token?.modelFile
    ? { idle: known(token.modelIdleClip), walk: known(token.modelWalkClip), down: known(token.modelDownClip) }
    : AUTO_CLIPS;

/**
 * State of the token's 3D model in the form, for "Incluir token" and "Editar token". `active` is the modal's open flag:
 * the state starts again when it opens or the token changes. The saved model starts kept, because the token PUT replaces
 * every field, and its animation choices come with it; a newly picked file starts automatic (its clips are other ones).
 */
export const useModelFile = (token: TokenInfo | null, active: boolean): ModelFileState => {
  const [picked, setPicked] = useState<File | null>(null);
  const [keepsSaved, setKeepsSaved] = useState(!!token?.modelFile);
  const [invalid, setInvalid] = useState(false);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [clips, setClips] = useState<ModelClipChoices>(() => savedClips(token));

  useEffect(() => {
    if (!active) return;
    setPicked(null);
    setKeepsSaved(!!token?.modelFile);
    setInvalid(false);
    setClips(savedClips(token));
  }, [active, token]);

  // The picked file as a URL for the preview, released when another is picked or the form goes away.
  useEffect(() => {
    if (!picked) {
      setPickedUrl(null);
      return;
    }
    const url = URL.createObjectURL(picked);
    setPickedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const pick = useCallback((file: File) => {
    setPicked(file);
    setInvalid(false);
    setClips(AUTO_CLIPS);
  }, []);

  const remove = useCallback(() => {
    setPicked(null);
    setKeepsSaved(false);
    setInvalid(false);
    setClips(AUTO_CLIPS);
  }, []);

  const setClip = useCallback((state: AnimationState, choice: ModelClipChoice) => {
    setClips((prev) => (prev[state] === choice ? prev : { ...prev, [state]: choice }));
  }, []);

  const resolve = useCallback(async (): Promise<ResolvedModel> => {
    const modelFile = picked ? (await modelService.upload(picked)).fileName : keepsSaved ? token?.modelFile ?? null : null;
    return { modelFile, modelIdleClip: clips.idle, modelWalkClip: clips.walk, modelDownClip: clips.down };
  }, [picked, keepsSaved, token, clips]);

  const previewUrl = pickedUrl ?? (keepsSaved ? token?.modelFileUrl ?? null : null);
  return { picked, previewUrl, keepsSaved, invalid, clips, pick, remove, setInvalid, setClip, resolve };
};

export default useModelFile;
