import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** 3 = campaigns and maps (more text and actions); 4 = characters, NPCs, tokens, weapons and animations. */
export type CardGridColumns = 3 | 4;

/** Bootstrap row classes per variant: 3 → 1 / 2 (md) / 3 (xl); 4 → 3 on phones, 4 from lg. */
const ROW_CLASS: Record<CardGridColumns, string> = {
  3: 'row-cols-1 row-cols-md-2 row-cols-xl-3 g-3',
  4: 'row-cols-3 row-cols-lg-4 g-2 g-md-3',
};

interface CardGridProps<T> {
  /** null while the first page loads. */
  items: readonly T[] | null;
  cols: CardGridColumns;
  getKey: (item: T) => number | string;
  renderCard: (item: T) => ReactNode;
  emptyText: string;
  page?: number;
  totalPages?: number;
  onPage?: (page: number) => void;
}

/**
 * The library's lists as cards in columns (090): loading, the empty text across the whole width (not one column) and
 * previous/next paging like the lists of 087.
 */
export const CardGrid = <T,>({ items, cols, getKey, renderCard, emptyText, page = 1, totalPages = 1, onPage }: CardGridProps<T>) => {
  const { t } = useTranslation();
  if (items === null) return <p className="text-body-secondary">{t('common.loading')}</p>;
  if (items.length === 0) return <p className="text-body-secondary">{emptyText}</p>;

  return (
    <>
      <div className={`row ${ROW_CLASS[cols]} stm-library-grid${cols === 4 ? ' is-compact' : ''}`}>
        {items.map((item) => <div className="col" key={getKey(item)}>{renderCard(item)}</div>)}
      </div>
      {onPage && totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            {t('common.previous')}
          </button>
          <small className="text-body-secondary">{t('common.page', { page, total: totalPages })}</small>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            {t('common.next')}
          </button>
        </div>
      )}
    </>
  );
};

export default CardGrid;
