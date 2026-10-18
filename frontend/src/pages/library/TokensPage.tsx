import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { TokenGrid } from '../../components/tokens/TokenGrid';
import { LibraryPageHeader } from '../../components/library/LibraryPageHeader';
import { useTokenList } from '../../hooks/useTokenList';
import { tokenPath } from '../../lib/libraryRoutes';

/**
 * "Tokens" of the library (087; were the list tabs of the tokens window): "Meus tokens" (the pencil edits) and
 * "Buscar tokens" (the whole library, read-only for others' tokens); "Incluir token" creates one in full screen.
 */
export const TokensPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'search' ? 'search' : 'mine';
  const mine = useTokenList(tab === 'mine', true, 0);
  const library = useTokenList(tab === 'search', false, 0);
  const list = tab === 'mine' ? mine : library;

  return (
    <section>
      <LibraryPageHeader title={t('library.nav.tokens')}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(tokenPath('new'))}>{t('tokens.createTab')}</button>} />
      <Tabs
        tabs={[
          { key: 'mine', label: t('tokens.mineTab') },
          { key: 'search', label: t('tokens.searchTab') },
        ]}
        active={tab}
        onChange={(key) => setParams(key === 'mine' ? {} : { tab: key }, { replace: true })}
      />
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
      />
    </section>
  );
};

export default TokensPage;
