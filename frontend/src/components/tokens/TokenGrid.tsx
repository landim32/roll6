import { useTranslation } from 'react-i18next';
import type { TokenInfo } from '../../types/token';

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

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
  </svg>
);

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
                  <PencilIcon />
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
