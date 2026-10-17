import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import type { WeaponInfo } from '../../types/weapon';
import { EyeIcon, PencilIcon, TrashIcon } from '../ui/icons';

const PAGE_SIZE = 12;

interface WeaponListProps {
  /** "Minhas": only the user's own, with edit and delete. "Buscar": the whole library, with the owner's name. */
  mine: boolean;
  /** Changes when the list must be read again (after an upload, an edit or a delete). */
  version: number;
  onPreview: (weapon: WeaponInfo) => void;
  onEdit?: (weapon: WeaponInfo) => void;
  onDelete?: (weapon: WeaponInfo) => void;
}

/** One tab of "Armas" (082): name (and owner), a name search, 12 per page; preview, and edit/delete for the own. */
export const WeaponList = ({ mine, version, onPreview, onEdit, onDelete }: WeaponListProps) => {
  const { t } = useTranslation();
  const { search } = useWeapon();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WeaponInfo[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    search({ mine, page, pageSize: PAGE_SIZE, search: query })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotalPages(Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        toast.error(err instanceof Error ? err.message : t('common.unknownError'));
      });
    return () => { cancelled = true; };
  }, [search, mine, page, query, version, t]);

  return (
    <>
      <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(text); }}>
        <input className="form-control form-control-sm flex-grow-1 w-auto" type="search" value={text}
          placeholder={t('weapons.searchPlaceholder')} aria-label={t('weapons.searchPlaceholder')}
          onChange={(event) => setText(event.target.value)} />
        <button type="submit" className="btn btn-sm btn-outline-secondary">{t('common.search')}</button>
      </form>

      {items === null && <p className="text-body-secondary">{t('common.loading')}</p>}
      {items !== null && items.length === 0 && <p className="text-body-secondary">{t('weapons.empty')}</p>}
      {items !== null && items.length > 0 && (
        <ul className="list-group">
          {items.map((weapon) => (
            <li key={weapon.weaponId} className="list-group-item d-flex align-items-center gap-2">
              <div className="flex-grow-1 min-w-0">
                <div className="text-truncate fw-semibold" title={weapon.name}>{weapon.name}</div>
                {!mine && weapon.ownerName && (
                  <small className="text-body-secondary">{t('weapons.owner', { name: weapon.ownerName })}</small>
                )}
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onPreview(weapon)}
                title={t('weapons.previewLabel', { name: weapon.name })} aria-label={t('weapons.previewLabel', { name: weapon.name })}>
                <EyeIcon size={14} />
              </button>
              {onEdit && (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onEdit(weapon)}
                  title={t('weapons.editLabel', { name: weapon.name })} aria-label={t('weapons.editLabel', { name: weapon.name })}>
                  <PencilIcon size={14} />
                </button>
              )}
              {onDelete && (
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(weapon)}
                  title={t('weapons.deleteLabel', { name: weapon.name })} aria-label={t('weapons.deleteLabel', { name: weapon.name })}>
                  <TrashIcon size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <small className="text-body-secondary">{t('common.page', { page, total: totalPages })}</small>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      )}
    </>
  );
};

export default WeaponList;
