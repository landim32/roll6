import { LayoutToggle } from './LayoutToggle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserMenuHost } from './UserMenuHost';
import { TableSelect } from './TableSelect';
import { CharacterSelect } from './CharacterSelect';
import { NotificationBell } from './NotificationBell';
import { TurnControls } from './TurnControls';
import { TurnSummaryModal } from '../modals/TurnSummaryModal';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapEditor } from '../../hooks/useMapEditor';
import { campaignEditPath, characterPath, libraryPath } from '../../lib/libraryRoutes';
import { GearIcon } from '../ui/icons';
import { BrandLogo } from '../ui/BrandLogo';

interface TopMenuProps {
  onSave: () => void;
  /** Resolves true when it is fine to leave the current map. */
  guard: () => Promise<boolean>;
}

/**
 * Top menu of the table: the table combo (campaign and its map, with the master's settings gear), current character,
 * the turn, "Salvar mapa" (only when unsaved), the user menu and the notifications. Since 087 every library edit
 * happens in the full-screen library: the gear, "Gerenciar/Selecionar/Incluir personagem", "Outras campanhas…" and
 * "Mapas…" navigate there (the unsaved map stays in the editor's draft until the user comes back).
 */
export const TopMenu = ({ onSave, guard }: TopMenuProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentCampaign, isMaster } = useCampaign();
  const { isDirty, canEdit, loading } = useMapEditor();
  /** Finished turn whose summary is open (from the bell). */
  const [summaryTurn, setSummaryTurn] = useState<number | null>(null);

  return (
    <header className="stm-menu">
      {/* Horizontal logo on md+, only the symbol on phones, where the first row is tight (038). */}
      <span className="stm-menu-brand me-2">
        <BrandLogo variant="horizontal" height={32} className="d-none d-md-inline-flex" />
        <BrandLogo variant="symbol" height={32} className="d-md-none" />
      </span>
      {/* Phones: the three selects wrap to a second row below this break (CSS order). */}
      <span className="stm-menu-break" aria-hidden="true" />
      <TableSelect
        onOpenCampaign={() => navigate(libraryPath('campaigns', { tab: 'search' }))}
        onOpenMap={() => navigate(libraryPath('maps'))}
      />
      {isMaster && currentCampaign && (
        <button type="button" className="btn btn-sm btn-outline-secondary stm-settings-btn"
          onClick={() => navigate(campaignEditPath(currentCampaign.slug))}
          title={t('campaignSettings.open')} aria-label={t('campaignSettings.open')}>
          <GearIcon />
        </button>
      )}
      <CharacterSelect
        onManage={() => { if (currentCampaign) navigate(campaignEditPath(currentCampaign.slug)); }}
        onSelectCharacter={() => navigate(libraryPath('characters'))}
        onInclude={() => navigate(characterPath('new'))}
      />
      <TurnControls />
      <LayoutToggle />
      {isDirty && canEdit && (
        <button type="button" className="btn btn-sm btn-warning" onClick={onSave} disabled={loading}>
          {t('menu.saveMap')}
        </button>
      )}
      <div className="ms-auto d-flex align-items-center gap-2">
        <UserMenuHost beforeLogout={guard} />
        <NotificationBell onOpenTurn={setSummaryTurn} />
      </div>
      <TurnSummaryModal turnNo={summaryTurn} onClose={() => setSummaryTurn(null)} />
    </header>
  );
};

export default TopMenu;
