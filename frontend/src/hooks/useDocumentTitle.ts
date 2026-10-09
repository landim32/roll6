import { useEffect } from 'react';
import { documentTitle } from '../lib/documentTitle';
import type { DocumentTitleInput } from '../lib/documentTitle';

/** Keeps the browser tab's title on what is open (040). */
export const useDocumentTitle = ({ mapName, campaignName, isCampaignMap }: DocumentTitleInput) => {
  useEffect(() => {
    document.title = documentTitle({ mapName, campaignName, isCampaignMap });
  }, [mapName, campaignName, isCampaignMap]);
};
