import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LIBRARY_SECTIONS, libraryPath, sectionOf } from '../../lib/libraryRoutes';
import type { LibrarySection } from '../../lib/libraryRoutes';
import {
  CampaignIcon, CollectionIcon, MapIcon, PersonBadgeIcon, PersonFillIcon, PlayFillIcon, SwapIcon,
} from '../ui/icons';

const ICONS: Record<LibrarySection, ReactNode> = {
  campaigns: <CampaignIcon size={14} />,
  maps: <MapIcon size={14} />,
  characters: <PersonFillIcon size={14} />,
  npcs: <PersonBadgeIcon size={14} />,
  tokens: <CollectionIcon size={14} />,
  weapons: <SwapIcon size={14} />,
  animations: <PlayFillIcon size={14} />,
};

/**
 * The left menu of the library (087): one item per section, the current one marked; below `md` it becomes a dropdown
 * at the top of the content.
 */
export const LibraryNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const current = sectionOf(location.pathname);

  return (
    <>
      <nav className="stm-library-nav d-none d-md-flex" aria-label={t('library.title')}>
        <ul className="nav nav-pills flex-column gap-1 w-100">
          {LIBRARY_SECTIONS.map((section) => (
            <li key={section} className="nav-item">
              <NavLink to={libraryPath(section)}
                className={() => `nav-link d-flex align-items-center gap-2${current === section ? ' active' : ''}`}>
                {ICONS[section]}<span>{t(`library.nav.${section}`)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="stm-library-nav-mobile d-md-none">
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="btn btn-outline-secondary btn-sm dropdown-toggle w-100 text-start">
              {t('library.title')}: {current ? t(`library.nav.${current}`) : ''}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="dropdown-menu show stm-user-menu" align="start" sideOffset={4}>
              {LIBRARY_SECTIONS.map((section) => (
                <DropdownMenu.Item key={section} className={`dropdown-item d-flex align-items-center gap-2${current === section ? ' active' : ''}`}
                  onSelect={() => navigate(libraryPath(section))}>
                  {ICONS[section]}{t(`library.nav.${section}`)}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );
};

export default LibraryNav;
