import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAnimation } from '../../hooks/useAnimation';
import { copyToClipboard } from '../../lib/clipboard';
import { animationService } from '../../Services/animationService';
import { ANIMATION_TYPES } from '../../types/animation';
import type { AnimationInfo, AnimationType } from '../../types/animation';
import { BoxArrowUpRightIcon, CopyIcon, PencilIcon, TrashIcon } from '../ui/icons';

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
 * One tab of "Animações" (059): name, type, duration and whether it repeats; a type filter and a name search, 12 per
 * page. Every row copies its JSON; the user's own rows also open the editor in a new tab (086), edit and delete.
 */
export const AnimationList = ({ mine, version, onEdit, onDelete }: AnimationListProps) => {
  const { t, i18n } = useTranslation();
  const { search } = useAnimation();
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

      {items === null && <p className="text-body-secondary">{t('common.loading')}</p>}
      {items !== null && items.length === 0 && <p className="text-body-secondary">{t('animations.empty')}</p>}
      {items !== null && items.length > 0 && (
        <ul className="list-group">
          {items.map((animation) => (
            <li key={animation.animationId} className="list-group-item d-flex align-items-center gap-2">
              <div className="flex-grow-1 min-w-0">
                <div className="text-truncate fw-semibold" title={animation.name}>{animation.name}</div>
                <small className="text-body-secondary">
                  <span className="badge text-bg-secondary me-2">{t(`animations.type.${animation.type}`)}</span>
                  {t('animations.duration', { seconds: seconds(animation.duration, i18n.language) })}
                  {' · '}
                  {animation.loop ? t('animations.loop') : t('animations.once')}
                  {!mine && animation.ownerName && <> · {t('animations.owner', { name: animation.ownerName })}</>}
                </small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { void copy(animation); }}
                title={t('animations.copy')} aria-label={t('animations.copy')}>
                <CopyIcon size={14} />
              </button>
              {mine && (
                <a className="btn btn-sm btn-outline-primary" href={`/animation/${animation.animationId}`} target="_blank" rel="noopener"
                  title={t('animations.openEditor')} aria-label={t('animations.openEditor')}>
                  <BoxArrowUpRightIcon size={14} />
                </a>
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

export default AnimationList;
