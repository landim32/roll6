import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCampaign } from './useCampaign';
import { useMapEditor } from './useMapEditor';
import { useMapToken } from './useMapToken';
import { turnService } from '../Services/turnService';
import { renderMapSnapshot } from '../lib/mapSnapshot';
import { buildShareText } from '../lib/whatsappText';

const aborted = (err: unknown): boolean => err instanceof Error && err.name === 'AbortError';

/** Shares the open campaign map (JPEG) plus the latest narration, or downloads both when the device cannot. */
export const useMapShare = () => {
  const { t } = useTranslation();
  const { currentCampaign } = useCampaign();
  const { draft, hexSize } = useMapEditor();
  const { mapTokens } = useMapToken();
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  const share = useCallback(async () => {
    if (!draft.mapId || !currentCampaign || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    try {
      const [blob, narration] = await Promise.all([
        renderMapSnapshot({ draft, tokens: mapTokens, hexSize }),
        turnService.narration(currentCampaign.campaignId),
      ]);
      const text = buildShareText({
        campaignName: currentCampaign.name,
        mapName: draft.name,
        turnNo: narration?.turnNo ?? null,
        narration: narration?.narration ?? null,
        turnLabel: narration ? t('share.turn', { no: narration.turnNo }) : null,
      });
      const file = new File([blob], `roll6-${draft.mapSlug ?? 'mapa'}.jpg`, { type: 'image/jpeg' });
      const payload: ShareData = { files: [file], text, title: draft.name || currentCampaign.name };
      if (navigator.canShare?.(payload)) {
        try {
          await navigator.share(payload);
        } catch (err) {
          if (aborted(err)) return;
          throw err;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        await navigator.clipboard.writeText(text);
        toast.info(t('share.fallback'));
      }
    } catch (err) {
      if (!aborted(err)) toast.error(t('share.error'));
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }, [currentCampaign, draft, hexSize, mapTokens, t]);

  return { share, sharing };
};
