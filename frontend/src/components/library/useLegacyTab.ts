import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { legacyTabPath } from '../../lib/libraryRoutes';
import type { LibrarySection } from '../../lib/libraryRoutes';

/**
 * 090: the list tabs became submenus with their own address. An 087 address with `?tab=` (a bookmark, the history)
 * is replaced by the submenu it meant — `?tab=search` → `/search`, `?tab=upload` → `/new`.
 */
export const useLegacyTab = (section: LibrarySection): void => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tab = params.get('tab');
  useEffect(() => {
    if (tab !== null) navigate(legacyTabPath(section, tab), { replace: true });
  }, [navigate, section, tab]);
};

export default useLegacyTab;
