import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LIBRARY_SECTIONS, LIBRARY_SUBSECTIONS, libraryPath, sectionOf, subsectionOf, subsectionPath } from '../../lib/libraryRoutes';
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
 * The left menu of the library (087): one item per section, the current one marked; since 090 the current section
 * opens its submenus under it (they replaced the list tabs), the one on screen marked. Below `md` it becomes a
 * dropdown at the top of the content, with the current section's submenus indented.
 */
export const LibraryNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const current = sectionOf(location.pathname);
  const shown = subsectionOf(location.pathname);
  const subLabel = (section: LibrarySection, sub: string) => t(`library.sub.${section}.${sub}`);

  return (
    <>
      <nav className="stm-library-nav d-none d-md-flex" aria-label={t('library.title')}>
        <ul className="nav nav-pills flex-column gap-1 w-100">
          {LIBRARY_SECTIONS.map((section) => {
            const subs = LIBRARY_SUBSECTIONS[section];
            const open = current === section && subs.length > 0;
            // The section is the active pill only when no submenu stands for the page (an item, "new"…).
            const active = current === section && !(open && shown?.section === section);
            return (
              <li key={section} className="nav-item">
                <NavLink to={libraryPath(section)}
                  className={() => `nav-link d-flex align-items-center gap-2${active ? ' active' : ''}${open && !active ? ' is-parent' : ''}`}>
                  {ICONS[section]}<span>{t(`library.nav.${section}`)}</span>
                </NavLink>
                {open && (
                  <ul className="nav stm-library-subnav" aria-label={t(`library.nav.${section}`)}>
                    {subs.map((sub) => (
                      <li key={sub} className="nav-item">
                        <NavLink to={subsectionPath(section, sub)}
                          className={() => `nav-link${shown?.section === section && shown.subsection === sub ? ' active' : ''}`}>
                          {subLabel(section, sub)}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="stm-library-nav-mobile d-md-none">
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="btn btn-outline-secondary btn-sm dropdown-toggle w-100 text-start text-truncate">
              {t('library.title')}: {current ? t(`library.nav.${current}`) : ''}
              {shown ? ` › ${subLabel(shown.section, shown.subsection)}` : ''}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="dropdown-menu show stm-user-menu" align="start" sideOffset={4}>
              {LIBRARY_SECTIONS.map((section) => (
                <div key={section}>
                  <DropdownMenu.Item
                    className={`dropdown-item d-flex align-items-center gap-2${current === section && !shown ? ' active' : ''}`}
                    onSelect={() => navigate(libraryPath(section))}>
                    {ICONS[section]}{t(`library.nav.${section}`)}
                  </DropdownMenu.Item>
                  {current === section && LIBRARY_SUBSECTIONS[section].map((sub) => (
                    <DropdownMenu.Item key={sub}
                      className={`dropdown-item ps-5${shown?.subsection === sub ? ' active' : ''}`}
                      onSelect={() => navigate(subsectionPath(section, sub))}>
                      {subLabel(section, sub)}
                    </DropdownMenu.Item>
                  ))}
                </div>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );
};

export default LibraryNav;
