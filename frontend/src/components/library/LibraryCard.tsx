import type { ReactNode } from 'react';

interface LibraryCardProps {
  /** The full name: truncated on the card, whole in the tooltip. */
  title: string;
  /** The picture: an `<img>`, a `Thumbnail` or nothing (then `fallback` shows). */
  figure?: ReactNode;
  /** The section's icon, drawn on a neutral background when there is no picture. */
  fallback: ReactNode;
  /** 16:9 for campaigns and maps, 1:1 for the rest. */
  ratio: 'wide' | 'square';
  /** Small line under the title (owner, master…). */
  meta?: ReactNode;
  badges?: ReactNode;
  /** Extra content between the meta line and the actions (e.g. the campaign fields of an NPC). */
  extra?: ReactNode;
  /** Icon-only buttons (each with `title` + `aria-label`). */
  actions?: ReactNode;
  /** What clicking the card does (open on the table, open the page). */
  onOpen?: () => void;
  /** Muted look (e.g. archived map). */
  muted?: boolean;
}

/**
 * One item of a library list as a card (090): the picture on top at a fixed ratio, the name, a meta line, badges and
 * the actions of the row it replaced. The picture and the name open the item; the actions sit apart so they never do.
 */
export const LibraryCard = ({ title, figure, fallback, ratio, meta, badges, extra, actions, onOpen, muted }: LibraryCardProps) => {
  const body = (
    <>
      <span className={`stm-library-card-figure ratio ${ratio === 'wide' ? 'ratio-16x9' : 'ratio-1x1'}`}>
        {figure ?? <span className="stm-library-card-fallback" aria-hidden="true">{fallback}</span>}
      </span>
      <span className="stm-library-card-title text-truncate" title={title}>{title}</span>
    </>
  );
  return (
    <div className={`card h-100 stm-library-card${muted ? ' is-muted' : ''}`}>
      {onOpen
        ? <button type="button" className="stm-library-card-open" onClick={onOpen} title={title}>{body}</button>
        : <div className="stm-library-card-open">{body}</div>}
      {(meta || badges) && (
        <div className="stm-library-card-meta">
          {meta && <small className="text-body-secondary text-truncate d-block">{meta}</small>}
          {badges && <div className="d-flex flex-wrap gap-1">{badges}</div>}
        </div>
      )}
      {extra && <div className="stm-library-card-extra">{extra}</div>}
      {actions && <div className="stm-library-card-actions">{actions}</div>}
    </div>
  );
};

export default LibraryCard;
