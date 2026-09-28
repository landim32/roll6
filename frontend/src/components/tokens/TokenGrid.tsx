import { useTranslation } from 'react-i18next';
import type { TokenInfo } from '../../types/token';
import { PencilIcon } from '../ui/icons';

interface TokenGridProps {
  items: TokenInfo[];
  /** First load in progress (nothing to show yet). */
  loading: boolean;
  /** An action is running: choices are disabled. */
  busy: boolean;
  emptyText: string;
  onPick: (token: TokenInfo) => void;
  /** Shows the floating pencil on each token (only the user's own tokens). */
  onEdit?: (token: TokenInfo) => void;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

/**
 * Tokens in a 4-column grid (image or initial + name), paginated. Clicking a card picks the token; the
 * optional pencil floats over the top-right corner of the image as a sibling button, so it never picks.
 */
export const TokenGrid = ({ items, loading, busy, emptyText, onPick, onEdit, page, totalPages, onPage }: TokenGridProps) => {
  const { t } = useTranslation();

  if (loading) return <p className="text-body-secondary">{t('common.loading')}</p>;
  if (items.length === 0) return <p className="text-body-secondary">{emptyText}</p>;

  return (
    <>
      <div className="row row-cols-4 g-2">
        {items.map((token) => (
          <div className="col" key={token.tokenId}>
            <div className="stm-token-cell">
              <button type="button" className="stm-token-option" onClick={() => onPick(token)} disabled={busy} title={token.name}>
                {token.upImageUrl
                  ? <img src={token.upImageUrl} alt="" />
                  : <span className="stm-token-initial" aria-hidden="true">{token.name.trim().charAt(0).toUpperCase() || '?'}</span>}
                <span className="stm-token-name">{token.name}</span>
              </button>
              {onEdit && (
                <button
                  type="button"
                  className="stm-token-edit"
                  onClick={() => onEdit(token)}
                  disabled={busy}
                  aria-label={t('tokens.edit', { name: token.name })}
                  title={t('tokens.edit', { name: token.name })}
                >
                  <PencilIcon size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>{t('common.previous')}</button>
          <small className="text-body-secondary">{t('common.page', { page, total: totalPages })}</small>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)}>{t('common.next')}</button>
        </div>
      )}
    </>
  );
};

export default TokenGrid;
