import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PagedList } from '../../types/common';

interface PagedListViewProps<T> {
  data: PagedList<T> | null;
  loading: boolean;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => number;
  onSelect: (item: T) => void;
  /** Buttons at the right of each row (edit, ...). Without it the whole row is one button. */
  renderActions?: (item: T) => ReactNode;
  onPageChange: (page: number) => void;
}

/** Clickable list with loading/empty states and previous/next paging. */
export const PagedListView = <T,>({ data, loading, renderItem, getKey, onSelect, renderActions, onPageChange }: PagedListViewProps<T>) => {
  const { t } = useTranslation();
  if (loading) return <p className="text-body-secondary">{t('common.loading')}</p>;
  if (!data || data.items.length === 0) return <p className="text-body-secondary">{t('common.empty')}</p>;

  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  return (
    <>
      <div className="list-group stm-list">
        {data.items.map((item) => {
          const actions = renderActions?.(item);
          if (!actions) {
            return (
              <button type="button" key={getKey(item)} className="list-group-item list-group-item-action" onClick={() => onSelect(item)}>
                {renderItem(item)}
              </button>
            );
          }
          return (
            <div key={getKey(item)} className="list-group-item d-flex align-items-center gap-2">
              <button type="button" className="btn btn-link text-start text-reset text-decoration-none p-0 flex-grow-1 border-0"
                onClick={() => onSelect(item)}>
                {renderItem(item)}
              </button>
              <div className="d-flex gap-1 flex-shrink-0">{actions}</div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={data.page <= 1} onClick={() => onPageChange(data.page - 1)}>
            {t('common.previous')}
          </button>
          <small className="text-body-secondary">{t('common.page', { page: data.page, total: totalPages })}</small>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={data.page >= totalPages} onClick={() => onPageChange(data.page + 1)}>
            {t('common.next')}
          </button>
        </div>
      )}
    </>
  );
};

export default PagedListView;
