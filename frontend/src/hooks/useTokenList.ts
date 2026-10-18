import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useToken } from './useToken';
import type { PagedList } from '../types/common';
import type { TokenInfo } from '../types/token';

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 300;

/**
 * One list tab ("Meus Tokens" or "Buscar tokens"): its own search (debounced), page and result, loaded
 * only while the tab is visible. `reloadKey` forces a reload (after an edit).
 */
export const useTokenList = (active: boolean, mine: boolean, reloadKey: number) => {
  const { t } = useTranslation();
  const { search } = useToken();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedList<TokenInfo> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    search({ search: debounced, page, pageSize: PAGE_SIZE, mine })
      .then((list) => { if (!cancelled) setResult(list); })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : t('common.unknownError')); });
    return () => { cancelled = true; };
  }, [active, mine, debounced, page, reloadKey, search, t]);

  const reset = () => {
    setQuery('');
    setDebounced('');
    setPage(1);
    setResult(null);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  return { query, setQuery, page, setPage, result, totalPages, reset };
};

export default useTokenList;
