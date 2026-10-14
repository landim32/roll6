import { useCallback, useEffect, useState } from 'react';
import { modelService } from '../Services/modelService';
import type { TokenInfo } from '../types/token';

/** The "3D" tab of the token form (055): a newly picked `.glb`, or the saved model kept or removed. */
export interface ModelFileState {
  /** The file picked now (checked, not uploaded yet). */
  picked: File | null;
  /** What the preview shows: the picked file (as a blob URL) or the saved model while it is kept; null = none. */
  previewUrl: string | null;
  /** The saved model is still kept (it is sent back on save). */
  keepsSaved: boolean;
  /** The preview could not open the picked file: saving is blocked. */
  invalid: boolean;
  pick: (file: File) => void;
  /** Removes the model: the picked file and the saved one. */
  remove: () => void;
  setInvalid: (invalid: boolean) => void;
  /** The name to send: uploads the picked file, keeps the saved one, or null. */
  resolve: () => Promise<string | null>;
}

/**
 * State of the token's 3D model in the form, for "Incluir token" and "Editar token". `active` is the modal's open flag:
 * the state starts again when it opens or the token changes. The saved model starts kept, because the token PUT replaces
 * every field.
 */
export const useModelFile = (token: TokenInfo | null, active: boolean): ModelFileState => {
  const [picked, setPicked] = useState<File | null>(null);
  const [keepsSaved, setKeepsSaved] = useState(!!token?.modelFile);
  const [invalid, setInvalid] = useState(false);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setPicked(null);
    setKeepsSaved(!!token?.modelFile);
    setInvalid(false);
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
  }, []);

  const remove = useCallback(() => {
    setPicked(null);
    setKeepsSaved(false);
    setInvalid(false);
  }, []);

  const resolve = useCallback(async (): Promise<string | null> => {
    if (picked) return (await modelService.upload(picked)).fileName;
    return keepsSaved ? token?.modelFile ?? null : null;
  }, [picked, keepsSaved, token]);

  const previewUrl = pickedUrl ?? (keepsSaved ? token?.modelFileUrl ?? null : null);
  return { picked, previewUrl, keepsSaved, invalid, pick, remove, setInvalid, resolve };
};

export default useModelFile;
