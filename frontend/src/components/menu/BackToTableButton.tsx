import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { tableReturnPath } from '../../lib/libraryReturn';
import { ArrowLeftIcon } from '../ui/icons';

/** "← Voltar para campanha" (087): yellow, back to the table this tab left (`lib/libraryReturn`). */
export const BackToTableButton = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button type="button" className="btn btn-warning btn-sm d-inline-flex align-items-center gap-1 stm-back-to-table"
      onClick={() => navigate(tableReturnPath())} title={t('menu.backToTable')} aria-label={t('menu.backToTable')}>
      <ArrowLeftIcon size={14} />
      <span className="d-none d-sm-inline">{t('menu.backToTable')}</span>
    </button>
  );
};

export default BackToTableButton;
