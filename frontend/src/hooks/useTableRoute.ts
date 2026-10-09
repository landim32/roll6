import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCampaign } from './useCampaign';
import { useMapEditor } from './useMapEditor';
import { ApiError } from '../Services/apiHelpers';
import { parseTablePath, tablePathFor } from '../lib/tableRoute';
import { useChat } from './useChat';
import { LAYOUT_MODE } from '../lib/layoutMode';

/**
 * Keeps the address and the open table in step.
 * URL → state when the path changes (through the unsaved-changes guard).
 * State → URL when the open campaign or map changes, and only then.
 */
export const useTableRoute = (guard: () => Promise<boolean>) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const campaign = useCampaign();
  const editor = useMapEditor();

  const { layoutMode, setLayoutMode } = useChat();

  // A notification opens the campaign with "?chat=1" (043): show the chat (split when only the map was on screen)
  // and drop the flag from the address.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('chat')) return;
    if (layoutMode === LAYOUT_MODE.map) setLayoutMode(LAYOUT_MODE.split);
    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, layoutMode, setLayoutMode, navigate]);

  const pendingRef = useRef(false);
  const guardRef = useRef(guard);
  guardRef.current = guard;
  const campaignRef = useRef(campaign);
  campaignRef.current = campaign;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const parsed = parseTablePath(location.pathname);
  const routeKey = `${parsed.kind}:${parsed.slug ?? ''}`;

  useEffect(() => {
    const path = parseTablePath(pathnameRef.current);
    if (path.kind === 'root' || !path.slug) return;

    const openCampaign = campaignRef.current.currentCampaign;
    const draft = editorRef.current.draft;
    if (path.kind === 'campaign' && openCampaign?.slug === path.slug) return;
    if (path.kind === 'map' && draft.mapSlug === path.slug) return;

    let cancelled = false;
    pendingRef.current = true;

    const pathForOpenTable = () => tablePathFor({
      campaignSlug: campaignRef.current.currentCampaign?.slug ?? null,
      mapSlug: editorRef.current.draft.mapSlug,
      mapCampaignId: editorRef.current.draft.campaignId,
      campaignId: campaignRef.current.currentCampaign?.campaignId ?? null,
    });

    (async () => {
      try {
        const allowed = await guardRef.current();
        if (cancelled) return;
        if (!allowed) {
          navigate(pathForOpenTable(), { replace: true });
          return;
        }

        if (path.kind === 'campaign') {
          const found = await campaignRef.current.getCampaignBySlug(path.slug!);
          if (!cancelled) campaignRef.current.selectCampaign(found);
          return;
        }

        // A player asking for a map that isn't the campaign's current one gets the current one (039); the URL
        // follows through the state → URL effect below.
        const { campaign, outcome } = await editorRef.current.openCampaignMapBySlug(path.slug!);
        if (cancelled) return;
        if (campaignRef.current.currentCampaign?.campaignId !== campaign.campaignId) campaignRef.current.selectCampaign(campaign);
        if (outcome === 'redirected') toast.info(t('route.notCurrentMap'));
        if (outcome === 'noCurrentMap') toast.info(t('map.noCurrentMap'));
      } catch (err) {
        if (cancelled) return;
        toast.error(t(err instanceof ApiError && err.status === 403 ? 'route.forbidden' : 'route.notFound'));
        navigate('/', { replace: true });
      } finally {
        if (!cancelled) pendingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      pendingRef.current = false;
    };
  }, [routeKey, navigate, t]);

  const stateKey = `${campaign.currentCampaign?.campaignId ?? ''}:${editor.draft.mapId ?? ''}:${editor.draft.mapSlug ?? ''}`;

  useEffect(() => {
    if (pendingRef.current) return;
    const next = tablePathFor({
      campaignSlug: campaign.currentCampaign?.slug ?? null,
      mapSlug: editor.draft.mapSlug,
      mapCampaignId: editor.draft.campaignId,
      campaignId: campaign.currentCampaign?.campaignId ?? null,
    });
    if (next !== pathnameRef.current) navigate(next, { replace: true });
  }, [stateKey, navigate, campaign.currentCampaign, editor.draft.campaignId, editor.draft.mapSlug]);
};
