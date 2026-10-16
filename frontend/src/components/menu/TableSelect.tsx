import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CampaignIcon, CollectionIcon, MapIcon } from '../ui/icons';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { tableEntries, triggerLabels } from '../../lib/tableSelect';
import { isPlayable, statusLabelKey } from '../../lib/campaignStatus';
import { isFreeMode } from '../../lib/freeMode';

interface TableSelectProps {
  onOpenCampaign: () => void;
  onOpenMap: () => void;
}

/**
 * Single combo for the table: the trigger shows the open map over its campaign; the menu groups each campaign with
 * its maps below it, then the windows for other campaigns and maps. 078: by the user's role in each campaign — the
 * master sees his preparing/active campaigns with every current and active map (the current one marked "Atual"), a
 * player only his active campaigns with their current map. Choosing a map only opens it ("Tornar atual" moves the
 * players).
 */
export const TableSelect = ({ onOpenCampaign, onOpenMap }: TableSelectProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentCampaign, tableCampaigns, refreshTableCampaigns } = useCampaign();
  const { draft } = useMapEditor();
  const labels = triggerLabels(draft.name, currentCampaign?.name ?? null);
  const entries = tableEntries(tableCampaigns, {
    campaignId: currentCampaign?.campaignId ?? null,
    mapId: draft.mapId,
  });
  // 049: a campaign that is not active says so next to its name.
  const statusOf = new Map(tableCampaigns.map((campaign) => [String(campaign.campaignId), campaign.status]));
  const statusBadge = (status: number | undefined) => (isPlayable(status) ? null : (
    <span className="badge text-bg-secondary ms-auto flex-shrink-0">{t(statusLabelKey(status))}</span>
  ));
  // 054: a campaign in free mode says so too.
  const freeOf = new Map(tableCampaigns.map((campaign) => [String(campaign.campaignId), campaign.freeMode === true]));
  const freeBadge = (freeMode: boolean) => (freeMode ? (
    <span className="badge text-bg-info flex-shrink-0">{t('turn.freeMode')}</span>
  ) : null);

  return (
    <DropdownMenu.Root modal={false} onOpenChange={(open) => { if (open) void refreshTableCampaigns(); }}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="form-select form-select-sm stm-fake-select stm-table-select" aria-label={t('menu.tableSelect')}>
          <span className="stm-table-select-line">
            <MapIcon size={12} />
            <span className="text-truncate">{labels.map || t('menu.noMapOpen')}</span>
          </span>
          <span className="stm-table-select-campaign">
            <CampaignIcon size={11} />
            <span className="text-truncate">{labels.campaign ?? t('menu.chooseCampaign')}</span>
            {currentCampaign && statusBadge(currentCampaign.status)}
            {currentCampaign && freeBadge(isFreeMode(currentCampaign))}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu stm-table-menu" align="start" sideOffset={4}>
          {entries.map((entry) => (
            <div key={entry.key} className="stm-table-group">
              <DropdownMenu.Item
                className={`dropdown-item stm-table-item stm-table-campaign${entry.campaignActive ? ' active' : ''}`}
                aria-current={entry.campaignActive ? 'true' : undefined}
                onSelect={() => navigate(entry.campaignPath)}
              >
                <CampaignIcon size={13} />
                <span className="text-truncate">{entry.campaignLabel}</span>
                {statusBadge(statusOf.get(entry.key))}
                {freeBadge(freeOf.get(entry.key) === true)}
              </DropdownMenu.Item>
              {entry.maps.map((map) => (
                <DropdownMenu.Item
                  key={map.key}
                  className={`dropdown-item stm-table-item stm-table-map${map.active ? ' active' : ''}`}
                  aria-current={map.active ? 'true' : undefined}
                  onSelect={() => navigate(map.path)}
                >
                  <MapIcon size={12} />
                  <span className="text-truncate">{map.label}</span>
                  {entry.isMaster && map.isCurrent && (
                    <span className="badge text-bg-info ms-auto flex-shrink-0">{t('menu.currentMap')}</span>
                  )}
                </DropdownMenu.Item>
              ))}
              {entry.maps.length === 0 && (
                <DropdownMenu.Item
                  className="dropdown-item stm-table-item stm-table-map fst-italic"
                  onSelect={() => navigate(entry.campaignPath)}
                >
                  <MapIcon size={12} />
                  <span className="text-truncate">{t('menu.noActiveMap')}</span>
                </DropdownMenu.Item>
              )}
            </div>
          ))}
          {entries.length > 0 && <DropdownMenu.Separator className="dropdown-divider my-1" />}
          <DropdownMenu.Item className="dropdown-item stm-table-item" onSelect={onOpenCampaign}>
            <CollectionIcon size={13} />
            <span>{t('menu.otherCampaigns')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item stm-table-item" onSelect={onOpenMap}>
            <MapIcon size={13} />
            <span>{t('menu.maps')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default TableSelect;
