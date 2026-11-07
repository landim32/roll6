import { useTranslation } from 'react-i18next';
import { useUpdate } from '../../hooks/useUpdate';
import { ConfirmModal } from './ConfirmModal';
import { ArrowRepeatIcon } from './icons';

/**
 * "Nova versão do Roll6 disponível" (110): a card at the bottom middle, above the footer and every window, with
 * "Atualizar" and "Depois". With unsaved work "Atualizar" asks first ("Descartar e atualizar").
 */
export const UpdateNotice = () => {
  const { t } = useTranslation();
  const { showNotice, reload, later, confirming, confirmReload, cancelReload } = useUpdate();

  return (
    <>
      {showNotice && (
        <div className="stm-update-notice" role="status" aria-live="polite">
          <ArrowRepeatIcon size={18} />
          <span className="stm-update-text">{t('update.title')}</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={reload}>{t('update.reload')}</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={later}>{t('update.later')}</button>
        </div>
      )}
      <ConfirmModal
        open={confirming}
        onOpenChange={(open) => { if (!open) cancelReload(); }}
        title={t('update.confirmTitle')}
        message={t('update.confirmMessage')}
        confirmLabel={t('update.confirm')}
        onConfirm={confirmReload}
        danger
      />
    </>
  );
};

export default UpdateNotice;
