import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { useAuth } from '../../hooks/useAuth';
import { loadAnimation } from '../../lib/animationCache';
import { copyToClipboard } from '../../lib/clipboard';
import { animationService } from '../../Services/animationService';
import { animationEditorPath } from '../../lib/libraryRoutes';
import { ANIMATION_TYPES } from '../../types/animation';
import type { AnimationInfo, AnimationType } from '../../types/animation';
import { CopyIcon, PencilIcon, PlayFillIcon, TrashIcon } from '../ui/icons';
import { CardGrid } from '../library/CardGrid';
import { LibraryCard } from '../library/LibraryCard';
import { Thumbnail } from '../library/Thumbnail';

/** Draws an animation's card picture (090): the standard skeleton in its key pose. */
const renderAnimation = async (animation: AnimationInfo): Promise<Blob> => {
  const clip = await loadAnimation(animation.animationId);
  if (!clip) throw new Error('animation not loaded');
  const { renderAnimationThumbnail } = await import('../library/animationThumbnail');
  return renderAnimationThumbnail(clip);
};

const PAGE_SIZE = 12;

interface AnimationListProps {
  /** "Minhas": only the user's own, with edit and delete. "Buscar": the whole library, with the owner's name. */
  mine: boolean;
  /** Changes when the list must be read again (after an upload, an edit or a delete). */
  version: number;
  onEdit?: (animation: AnimationInfo) => void;
  onDelete?: (animation: AnimationInfo) => void;
}

/** Duration in pt-BR ("1,2 s"). */
const seconds = (value: number, locale: string) => value.toLocaleString(locale, { maximumFractionDigits: 2 });

/**
 * One submenu of "Animações" (059; a tab until 090): name, type, duration and whether it repeats; a type filter and a
 * name search, 12 per page — since 090 as cards in 4 columns (3 on phones) with the animation's picture (stored, else
 * drawn here and, for the user's own, stored). Every card copies its JSON; the user's own also open the editor, edit
 * and delete.
 */
export const AnimationList = ({ mine, version, onEdit, onDelete }: AnimationListProps) => {
  const { t, i18n } = useTranslation();
  const { search, storeThumbnail } = useAnimation();
  const { session } = useAuth();
  const userId = session?.user.userId ?? null;
  const [type, setType] = useState<AnimationType | 0>(0);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnimationInfo[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    search({ mine, page, pageSize: PAGE_SIZE, search: query, type: type || undefined })
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
  }, [search, mine, page, query, type, version, t]);

  const copy = useCallback(async (animation: AnimationInfo) => {
    try {
      const content = await animationService.getContent(animation.animationId);
      if (await copyToClipboard(content)) toast.success(t('animations.copied'));
      else toast.error(t('animations.copyFailed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('animations.copyFailed'));
    }
  }, [t]);

  return (
    <>
      <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(text); }}>
        <select className="form-select form-select-sm w-auto" aria-label={t('animations.typeFilter')} value={type}
          onChange={(event) => { setPage(1); setType(Number(event.target.value) as AnimationType | 0); }}>
          <option value={0}>{t('animations.allTypes')}</option>
          {ANIMATION_TYPES.map((value) => <option key={value} value={value}>{t(`animations.type.${value}`)}</option>)}
        </select>
        <input className="form-control form-control-sm flex-grow-1 w-auto" type="search" value={text}
          placeholder={t('animations.searchPlaceholder')} aria-label={t('animations.searchPlaceholder')}
          onChange={(event) => setText(event.target.value)} />
        <button type="submit" className="btn btn-sm btn-outline-secondary">{t('common.search')}</button>
      </form>

      <CardGrid
        items={items}
        cols={4}
        getKey={(animation) => animation.animationId}
        emptyText={t('animations.empty')}
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        renderCard={(animation) => (
          <LibraryCard
            ratio="square"
            title={animation.name}
            figure={(
              <Thumbnail
                storedUrl={animation.thumbnailImageUrl}
                render={() => renderAnimation(animation)}
                alt={t('library.thumbnail.alt', { name: animation.name })}
                fallback={<PlayFillIcon />}
                onRendered={animation.userId === userId && !animation.thumbnailImage
                  ? (blob) => { void storeThumbnail(animation, blob); } : undefined}
              />
            )}
            fallback={<PlayFillIcon />}
            onOpen={onEdit ? () => onEdit(animation) : undefined}
            meta={(
              <>
                {t('animations.duration', { seconds: seconds(animation.duration, i18n.language) })}
                {' · '}
                {animation.loop ? t('animations.loop') : t('animations.once')}
                {!mine && animation.ownerName && <> · {t('animations.owner', { name: animation.ownerName })}</>}
              </>
            )}
            badges={<span className="badge text-bg-secondary">{t(`animations.type.${animation.type}`)}</span>}
            actions={(
              <>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { void copy(animation); }}
                  title={t('animations.copy')} aria-label={t('animations.copy')}>
                  <CopyIcon size={14} />
                </button>
                {mine && (
                  <Link className="btn btn-sm btn-outline-primary" to={animationEditorPath(animation.animationId)}
                    title={t('animations.openEditor')} aria-label={t('animations.openEditor')}>
                    <PlayFillIcon size={14} />
                  </Link>
                )}
                {onEdit && (
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onEdit(animation)}
                    title={t('animations.editLabel', { name: animation.name })} aria-label={t('animations.editLabel', { name: animation.name })}>
                    <PencilIcon size={14} />
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(animation)}
                    title={t('animations.deleteLabel', { name: animation.name })} aria-label={t('animations.deleteLabel', { name: animation.name })}>
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

export default AnimationList;
