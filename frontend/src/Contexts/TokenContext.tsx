import { createContext, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { tokenService } from '../Services/tokenService';
import type { ListQuery, PagedList } from '../types/common';
import type { TokenInfo, TokenInsertInfo } from '../types/token';

interface TokenContextType {
  loading: boolean;
  error: string | null;
  /** Paged token library, searching by name. */
  search: (query: ListQuery) => Promise<PagedList<TokenInfo>>;
  create: (data: TokenInsertInfo) => Promise<TokenInfo>;
  /** Changes one of the user's own tokens. */
  update: (tokenId: number, data: TokenInsertInfo) => Promise<TokenInfo>;
  clearError: () => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

/** Token library (used by the tokens modal). */
export const TokenProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      return await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback((query: ListQuery) => run(() => tokenService.list(query)), [run]);
  const create = useCallback((data: TokenInsertInfo) => run(() => tokenService.create(data)), [run]);
  const update = useCallback((tokenId: number, data: TokenInsertInfo) =>
    run(() => tokenService.update(tokenId, data)), [run]);
  const clearError = useCallback(() => setError(null), []);

  const value: TokenContextType = { loading, error, search, create, update, clearError };
  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
};

export default TokenContext;
