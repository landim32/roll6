import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWeapon } from '../../hooks/useWeapon';
import { useAuth } from '../../hooks/useAuth';
import type { WeaponInfo } from '../../types/weapon';
import { EyeIcon, PencilIcon, SwapIcon, TrashIcon } from '../ui/icons';
import { CardGrid } from '../library/CardGrid';
import { LibraryCard } from '../library/LibraryCard';
import { Thumbnail } from '../library/Thumbnail';

/** Draws a weapon's card picture (090): its model in its standard pose (three.js, loaded only here). */
const renderWeapon = async (weapon: WeaponInfo, signal: AbortSignal): Promise<Blob> => {
  if (!weapon.modelFileUrl) throw new Error('no model');
  const { renderWeaponThumbnail } = await import('../library/weaponThumbnail');
  return renderWeaponThumbnail({ url: weapon.modelFileUrl }, weapon.pose, signal);
};

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

/**
 * One submenu of "Armas" (082; a tab until 090): name (and owner), a name search, 12 per page; preview, and edit/delete
 * for the own — since 090 as cards in 4 columns (3 on phones) with the weapon's picture (stored, else drawn here and,
 * for the user's own, stored).
 */
export const WeaponList = ({ mine, version, onPreview, onEdit, onDelete }: WeaponListProps) => {
  const { t } = useTranslation();
  const { search, storeThumbnail } = useWeapon();
  const { session } = useAuth();
  const userId = session?.user.userId ?? null;
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

      <CardGrid
        items={items}
        cols={4}
        getKey={(weapon) => weapon.weaponId}
        emptyText={t('weapons.empty')}
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        renderCard={(weapon) => (
          <LibraryCard
            ratio="square"
            title={weapon.name}
            figure={(
              <Thumbnail
                storedUrl={weapon.thumbnailImageUrl}
                render={(signal) => renderWeapon(weapon, signal)}
                alt={t('library.thumbnail.alt', { name: weapon.name })}
                fallback={<SwapIcon />}
                onRendered={weapon.userId === userId && !weapon.thumbnailImage
                  ? (blob) => { void storeThumbnail(weapon, blob); } : undefined}
              />
            )}
            fallback={<SwapIcon />}
            onOpen={() => onPreview(weapon)}
            meta={!mine && weapon.ownerName ? t('weapons.owner', { name: weapon.ownerName }) : undefined}
            actions={(
              <>
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
              </>
            )}
          />
        )}
      />
    </>
  );
};

export default WeaponList;
