import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ImageCrop } from '../components/ui/ImageCropper';
import { EMPTY_VIEWS, resolveSpriteImages, tokenSpriteNames, tokenSpriteUrls } from '../lib/spriteView';
import type { SpriteImages, SpriteView, ViewImages } from '../lib/spriteView';
import { uploadSpriteImage } from '../lib/uploadSpriteImage';
import type { TokenInfo } from '../types/token';

/** The four sides of the token form (035), shared by "Incluir token" and "Editar token". */
export interface SpriteImagesState {
  /** Saved URL of each side (null when the token has none); show it while `has` says the image is kept. */
  savedUrls: SpriteImages;
  /** Whether the side has an image to show: a saved one still kept, since a new crop comes from its own field. */
  has: (view: SpriteView) => boolean;
  /** The crop chosen for a side, or null. */
  setCrop: (view: SpriteView, crop: ImageCrop | null) => void;
  /** Removes the side's image: the new crop and the saved one. */
  remove: (view: SpriteView) => void;
  /** Names to send: uploads the new crops, keeps the saved ones still kept, null for the removed. */
  resolve: () => Promise<SpriteImages>;
}

const noCrops = (): ViewImages<ImageCrop | null> => ({ front: null, right: null, left: null, back: null });

/** The saved images start kept: the token PUT replaces every field, so what the user does not touch must go back. */
const initialKeep = (token: TokenInfo | null): Record<SpriteView, boolean> => {
  const names = token ? tokenSpriteNames(token) : EMPTY_VIEWS;
  return { front: names.front !== null, right: names.right !== null, left: names.left !== null, back: names.back !== null };
};

/**
 * State of the four "2,5D" images of the form — the crop of a newly chosen picture and whether the saved one is still
 * kept, per side — so the two modals do not repeat four fields each. `active` is the modal's open flag: the state is
 * rebuilt when it turns on or when the token changes, so nothing is left over from another token.
 */
export const useSpriteImages = (token: TokenInfo | null, active: boolean): SpriteImagesState => {
  const [crops, setCrops] = useState(noCrops);
  const [keep, setKeep] = useState(() => initialKeep(token));

  useEffect(() => {
    if (!active) return;
    setCrops(noCrops());
    setKeep(initialKeep(token));
  }, [active, token]);

  const setCrop = useCallback((view: SpriteView, crop: ImageCrop | null) => {
    setCrops((prev) => ({ ...prev, [view]: crop }));
  }, []);

  const remove = useCallback((view: SpriteView) => {
    setCrops((prev) => ({ ...prev, [view]: null }));
    setKeep((prev) => ({ ...prev, [view]: false }));
  }, []);

  const savedUrls = useMemo(() => (token ? tokenSpriteUrls(token) : EMPTY_VIEWS), [token]);
  const has = useCallback((view: SpriteView) => keep[view], [keep]);
  const resolve = useCallback(
    () => resolveSpriteImages(token ? tokenSpriteNames(token) : EMPTY_VIEWS, keep, crops, uploadSpriteImage),
    [token, keep, crops],
  );

  return { savedUrls, has, setCrop, remove, resolve };
};

export default useSpriteImages;
