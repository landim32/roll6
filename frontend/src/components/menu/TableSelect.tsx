import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon } from '../ui/icons';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { tableEntries, triggerLabels } from '../../lib/tableSelect';

interface TableSelectProps {
  onOpenCampaign: () => void;
  onOpenMap: () => void;
}

/** Single combo for the table: each campaign shows its active map, then the campaign itself. */
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
        <button type="button" className="form-select form-select-sm stm-fake-select stm-table-select">
          <small>{t('menu.tableSelect')}</small>
          <span className="stm-table-select-line text-truncate">{labels.map || t('menu.noMapOpen')}</span>
          <span className="stm-table-select-campaign text-truncate">{labels.campaign ?? t('menu.chooseCampaign')}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-menu show stm-user-menu stm-table-menu" align="start" sideOffset={4}>
          {entries.map((entry) => (
            <div key={entry.key}>
              <DropdownMenu.Item
                className={`dropdown-item text-truncate${entry.mapActive ? ' active' : ''}${entry.mapLabel ? '' : ' fst-italic'}`}
                aria-current={entry.mapActive ? 'true' : undefined}
                onSelect={() => navigate(entry.mapPath)}
              >
                {entry.mapLabel ?? t('menu.noActiveMap')}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={`dropdown-item stm-table-campaign${entry.campaignActive ? ' active' : ''}`}
                aria-current={entry.campaignActive ? 'true' : undefined}
                onSelect={() => navigate(entry.campaignPath)}
              >
                <ArrowRightIcon size={12} />
                <span className="text-truncate">{entry.campaignLabel}</span>
              </DropdownMenu.Item>
            </div>
          ))}
          {entries.length > 0 && <DropdownMenu.Separator className="dropdown-divider" />}
          <DropdownMenu.Item className="dropdown-item" onSelect={onOpenCampaign}>{t('menu.otherCampaigns')}</DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" onSelect={onOpenMap}>{t('menu.maps')}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default TableSelect;
