import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CampaignIcon, CollectionIcon, MapIcon } from '../ui/icons';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { tableEntries, triggerLabels } from '../../lib/tableSelect';

interface TableSelectProps {
  onOpenCampaign: () => void;
  onOpenMap: () => void;
}

/**
 * Single combo for the table: the trigger shows the open map over its campaign; the menu groups each campaign with
 * its active map below it (both open the table), then the windows for other campaigns and maps.
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
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={`dropdown-item stm-table-item stm-table-map${entry.mapActive ? ' active' : ''}${entry.mapLabel ? '' : ' fst-italic'}`}
                aria-current={entry.mapActive ? 'true' : undefined}
                onSelect={() => navigate(entry.mapPath)}
              >
                <MapIcon size={12} />
                <span className="text-truncate">{entry.mapLabel ?? t('menu.noActiveMap')}</span>
              </DropdownMenu.Item>
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
