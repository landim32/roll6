import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TokenGrid } from '../../components/tokens/TokenGrid';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useLegacyTab } from '../../components/library/useLegacyTab';
import { useTokenList } from '../../hooks/useTokenList';
import { tokenPath } from '../../lib/libraryRoutes';
import type { OwnSubsection } from '../../lib/libraryRoutes';

/**
 * "Tokens" of the library (087; were the list tabs of the tokens window): "Meus tokens" (the pencil edits) and
 * "Buscar" (the whole library, read-only for others' tokens) — since 090 two submenus, 4 columns (3 on phones);
 * "Incluir token" creates one in full screen.
 */
export const TokensPage = ({ subsection }: { subsection: OwnSubsection }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLegacyTab('tokens');
  const tab = subsection;
  const mine = useTokenList(tab === 'mine', true, 0);
  const library = useTokenList(tab === 'search', false, 0);
  const list = tab === 'mine' ? mine : library;

  return (
    <section>
      <LibraryPageHeader title={t(`library.sub.tokens.${subsection}`)}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(tokenPath('new'))}>{t('tokens.createTab')}</button>} />
      <input type="search" className="form-control mb-3" placeholder={t('tokens.search')} aria-label={t('tokens.search')}
        value={list.query} onChange={(e) => list.setQuery(e.target.value)} />
      <TokenGrid
        items={list.result?.items ?? []}
        loading={list.result === null}
        busy={false}
        emptyText={t(tab === 'mine' ? 'tokens.mineEmpty' : 'tokens.empty')}
        onPick={(token) => navigate(tokenPath(token.tokenId))}
        onEdit={tab === 'mine' ? (token) => navigate(tokenPath(token.tokenId)) : undefined}
        page={list.page}
        totalPages={list.totalPages}
        onPage={list.setPage}
        cols="library"
      />
    </section>
  );
};

export default TokensPage;
