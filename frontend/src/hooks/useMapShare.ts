import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCampaign } from './useCampaign';
import { useMapEditor } from './useMapEditor';
import { useMapToken } from './useMapToken';
import { turnService } from '../Services/turnService';
import { renderMapSnapshot } from '../lib/mapSnapshot';
import { buildShareText } from '../lib/whatsappText';

/** DOMException name (AbortError, NotAllowedError...) of a failed share. */
const errorName = (err: unknown): string | null =>
  typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : null;

/** Downloads the picture (desktop, or a device that cannot share files). */
const download = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/**
 * Shares the open campaign map (JPEG with scene, grid and pieces) plus the latest narration. When the device
 * cannot send the picture and the text together, only the picture goes; without file sharing it is downloaded.
 */
export const useMapShare = () => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const { draft, hexSize } = useMapEditor();
  const { mapTokens } = useMapToken();
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  /** Tries picture + text, then the picture alone. Resolves false when the user cancelled. */
  const send = useCallback(async (withText: ShareData | null, imageOnly: ShareData): Promise<boolean> => {
    if (withText) {
      try {
        await navigator.share(withText);
        return true;
      } catch (err) {
        const name = errorName(err);
        if (name === 'AbortError') return false;
        // The gesture expired while the picture was being drawn: a retry needs a new tap.
        if (name === 'NotAllowedError') throw err;
      }
    }
    try {
      await navigator.share(imageOnly);
      return true;
    } catch (err) {
      if (errorName(err) === 'AbortError') return false;
      throw err;
    }
  }, []);

  const share = useCallback(async () => {
    if (!draft.mapId || !currentCampaign || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    try {
      const [blob, narration] = await Promise.all([
        renderMapSnapshot({ draft, tokens: mapTokens, hexSize }),
        turnService.narration(currentCampaign.campaignId).catch(() => null),
      ]);
      const text = buildShareText({
        campaignName: currentCampaign.name,
        mapName: draft.name,
        turnNo: narration?.turnNo ?? null,
        narration: narration?.narration ?? null,
        turnLabel: narration ? t('share.turn', { no: narration.turnNo }) : null,
      });
      const file = new File([blob], `roll6-${draft.mapSlug ?? 'mapa'}.jpg`, { type: 'image/jpeg' });
      const imageOnly: ShareData = { files: [file] };
      const both: ShareData = { files: [file], text };
      const withText = navigator.canShare?.(both) ? both : null;
      if (!withText && !navigator.canShare?.(imageOnly)) {
        download(file);
        toast.info(t('share.fallback'));
        return;
      }
      try {
        await send(withText, imageOnly);
      } catch (err) {
        if (errorName(err) !== 'NotAllowedError') throw err;
        toast.info(t('share.ready'), {
          duration: 15000,
          action: {
            label: t('share.send'),
            onClick: () => {
              send(withText, imageOnly).catch(() => {
                download(file);
                toast.info(t('share.fallback'));
              });
            },
          },
        });
      }
    } catch {
      toast.error(t('share.error'));
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }, [currentCampaign, draft, hexSize, mapTokens, send, t]);

  return { share, sharing };
};
