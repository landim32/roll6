import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PagedList } from '../../types/common';

interface PagedListViewProps<T> {
  data: PagedList<T> | null;
  loading: boolean;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => number;
  onSelect: (item: T) => void;
  onPageChange: (page: number) => void;
}

/** Clickable list with loading/empty states and previous/next paging. */
export const PagedListView = <T,>({ data, loading, renderItem, getKey, onSelect, onPageChange }: PagedListViewProps<T>) => {
  const { t } = useTranslation();
  if (loading) return <p className="text-body-secondary">{t('common.loading')}</p>;
  if (!data || data.items.length === 0) return <p className="text-body-secondary">{t('common.empty')}</p>;

  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  return (
    <>
      <div className="list-group stm-list">
        {data.items.map((item) => (
          <button type="button" key={getKey(item)} className="list-group-item list-group-item-action" onClick={() => onSelect(item)}>
            {renderItem(item)}
          </button>
        ))}
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
