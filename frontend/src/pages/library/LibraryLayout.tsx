import { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMapEditor } from '../../hooks/useMapEditor';
import { APP_NAME } from '../../lib/documentTitle';
import { isAnimationEditorPath } from '../../lib/libraryRoutes';
import { tableReturnPath } from '../../lib/libraryReturn';
import { LibraryNav } from '../../components/library/LibraryNav';
import { BackToTableButton } from '../../components/menu/BackToTableButton';
import { UserMenuHost } from '../../components/menu/UserMenuHost';
import { BrandLogo } from '../../components/ui/BrandLogo';

/**
 * The library (087): a full-screen area apart from the table — top bar with the logo, "← Voltar para campanha" and
 * the user menu; the left menu of the sections; the page of the address on the right. The table's unsaved map draft
 * stays in the editor while the user is here (the browser still warns on reload).
 */
export const LibraryLayout = () => {
  const { t } = useTranslation();
  const { isDirty, canEdit } = useMapEditor();
  // The animation editor (089) fills the content area edge to edge.
  const flush = isAnimationEditorPath(useLocation().pathname);

  useEffect(() => {
    document.title = `${t('library.title')} | ${APP_NAME}`;
  }, [t]);

  useEffect(() => {
    if (!(isDirty && canEdit)) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty, canEdit]);

  return (
    <div className="stm-library-page">
      <header className="stm-library-bar">
        <Link to={tableReturnPath()} className="stm-library-brand" title={t('menu.backToTable')} aria-label={t('menu.backToTable')}>
          <span className="d-none d-md-inline"><BrandLogo variant="horizontal" height={32} /></span>
          <span className="d-md-none"><BrandLogo variant="symbol" height={28} /></span>
        </Link>
        <h1 className="stm-library-title">{t('library.title')}</h1>
        <span className="flex-grow-1" />
        <BackToTableButton />
        <UserMenuHost />
      </header>
      <div className="stm-library-body">
        <LibraryNav />
        <main className={`stm-library-content${flush ? ' is-flush' : ''}`}>
          <Suspense fallback={<p className="text-body-secondary">{t('common.loading')}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default LibraryLayout;
