import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface NotFoundCardProps {
  message: string;
  /** The list to go back to. */
  backTo: string;
}

/** A library page that cannot be shown (087): not found, not the user's, not the master. */
export const NotFoundCard = ({ message, backTo }: NotFoundCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="card p-4 stm-library-empty">
      <p className="mb-3">{message}</p>
      <div><Link to={backTo} className="btn btn-primary btn-sm">{t('library.backToList')}</Link></div>
    </div>
  );
};

export default NotFoundCard;
