import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { turnLogMarkdown } from '../../lib/turnHistory';
import type { TurnHistoryState } from '../../hooks/useTurnHistory';

const MarkdownView = lazy(() => import('../ui/MarkdownView'));

interface TurnHistoryListProps {
  history: TurnHistoryState;
  /** Small font for the console over the map; the full-screen window uses the normal size. */
  compact?: boolean;
}

/**
 * The campaign's narrations, newest first (028): one block per narration — a turn can hold several, and the turn being
 * played is included — with more loaded when the end of the list shows up, and newer ones added at the top without
 * moving whoever is reading older ones ("Novidades"). No turn number and no date: it reads as one continuous story.
 */
export const TurnHistoryList = ({ history, compact = false }: TurnHistoryListProps) => {
  const { t } = useTranslation();
  const { items, loading, error, done, loadMore, retry, prependedAt } = history;
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  const [hasNews, setHasNews] = useState(false);

  // Infinite list: load older turns when the end becomes visible.
  useEffect(() => {
    const root = scroller.current;
    const target = sentinel.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { root, rootMargin: '0px 0px 80px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  // Newer turns at the top: keep the reading position and offer to go back up.
  useLayoutEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const grown = root.scrollHeight - lastHeight.current;
    if (prependedAt > 0 && root.scrollTop > 0 && grown > 0) {
      root.scrollTop += grown;
      setHasNews(true);
    }
    lastHeight.current = root.scrollHeight;
  }, [prependedAt]);

  useLayoutEffect(() => {
    if (scroller.current) lastHeight.current = scroller.current.scrollHeight;
  }, [items.length]);

  const toTop = () => {
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setHasNews(false);
  };

  return (
    <div className={`stm-turn-history${compact ? ' is-compact' : ''}`}>
      {hasNews && (
        <button type="button" className="btn btn-sm btn-primary stm-turn-history-news" onClick={toTop}>
          {t('turnConsole.news')}
        </button>
      )}
      <div ref={scroller} className="stm-turn-history-scroll" onScroll={(e) => { if (e.currentTarget.scrollTop === 0) setHasNews(false); }}>
        {items.map((item) => (
          <section key={item.turnId} className="stm-turn-history-item">
            <Suspense fallback={<div className="stm-turn-history-raw">{item.actions}</div>}>
              <MarkdownView value={turnLogMarkdown(item.actions)} emptyText="" />
            </Suspense>
          </section>
        ))}
        {!loading && !error && done && items.length === 0 && <p className="text-body-secondary mb-0">{t('turnConsole.empty')}</p>}
        {loading && <p className="text-body-secondary mb-0">{t('common.loading')}</p>}
        {error && (
          <p className="mb-0">
            <span className="text-danger me-2">{t('turnConsole.error')}</span>
            <button type="button" className="btn btn-link btn-sm p-0" onClick={retry}>{t('turnConsole.retry')}</button>
          </p>
        )}
        {!loading && !error && done && items.length > 0 && <p className="text-body-secondary mb-0">{t('turnConsole.start')}</p>}
        <div ref={sentinel} aria-hidden="true" className="stm-turn-history-sentinel" />
      </div>
    </div>
  );
};

export default TurnHistoryList;
