import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LibraryPageHeaderProps {
  title: string;
  /** A link back to the section's list (edit pages). */
  back?: { to: string; label: string };
  /** Buttons on the right (Novo, Salvar…). */
  actions?: ReactNode;
}

/** The heading of a library page (087): title, the way back to the list and the page's main actions. */
export const LibraryPageHeader = ({ title, back, actions }: LibraryPageHeaderProps) => (
  <div className="stm-library-head">
    <div className="min-w-0">
      {back && <Link to={back.to} className="small text-body-secondary text-decoration-none">← {back.label}</Link>}
      <h2 className="h4 mb-0 text-truncate">{title}</h2>
    </div>
    {actions && <div className="d-flex flex-wrap gap-2 ms-auto">{actions}</div>}
  </div>
);

export default LibraryPageHeader;
