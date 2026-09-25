import { useContext } from 'react';
import CampaignContext from '../Contexts/CampaignContext';

/** Access the Campaign context. Throws if used outside CampaignProvider. */
export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) throw new Error('useCampaign must be used within a CampaignProvider');
  return context;
};

export default useCampaign;
