import { useTranslation } from 'react-i18next';
import { CAMPAIGN_CHARACTER_STATUS } from '../../types/campaignCharacter';
import type { CampaignCharacterStatus } from '../../types/campaignCharacter';

const STATUS_STYLE: Record<CampaignCharacterStatus, { key: string; className: string }> = {
  [CAMPAIGN_CHARACTER_STATUS.invited]: { key: 'invited', className: 'text-bg-info' },
  [CAMPAIGN_CHARACTER_STATUS.requestedAccess]: { key: 'requestedAccess', className: 'text-bg-warning' },
  [CAMPAIGN_CHARACTER_STATUS.approved]: { key: 'approved', className: 'text-bg-success' },
  [CAMPAIGN_CHARACTER_STATUS.denied]: { key: 'denied', className: 'text-bg-danger' },
};

/** Participation status badge; no status means "Fora da campanha". */
export const StatusBadge = ({ status }: { status?: CampaignCharacterStatus }) => {
  const { t } = useTranslation();
  const style = status ? STATUS_STYLE[status] : { key: 'none', className: 'text-bg-secondary' };
  return <span className={`badge ${style.className}`}>{t(`characterStatus.${style.key}`)}</span>;
};

export default StatusBadge;
