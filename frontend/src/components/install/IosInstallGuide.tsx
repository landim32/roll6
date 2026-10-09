import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { PlusSquareIcon, ShareIosIcon } from '../ui/icons';
import { useInstall } from '../../hooks/useInstall';

/**
 * How to install the Roll6 on iPhone/iPad (042): Safari has no install button, so the app explains the steps. Opened
 * by "Instalar o Roll6" (menu or the one-time notice) and, with #39, before offering notifications (`openGuide`).
 */
export const IosInstallGuide = () => {
  const { t } = useTranslation();
  const { guideOpen, closeGuide, iosSafari } = useInstall();

  return (
    <Modal
      open={guideOpen}
      onOpenChange={(open) => { if (!open) closeGuide(); }}
      title={t('install.guideTitle')}
      footer={<button type="button" className="btn btn-primary" onClick={closeGuide}>{t('install.guideClose')}</button>}
    >
      {!iosSafari && <p className="small text-body-secondary">{t('install.guideOtherBrowser')}</p>}
      <ol className="stm-install-steps">
        <li>
          <span className="stm-install-step-icon" aria-hidden="true"><ShareIosIcon size={22} /></span>
          <span>{t('install.guideStep1')}</span>
        </li>
        <li>
          <span className="stm-install-step-icon" aria-hidden="true"><PlusSquareIcon size={22} /></span>
          <span>{t('install.guideStep2')}</span>
        </li>
        <li>
          <span className="stm-install-step-icon" aria-hidden="true">
            <img src="/brand/apple-touch-icon.png" alt="" width={24} height={24} />
          </span>
          <span>{t('install.guideStep3')}</span>
        </li>
      </ol>
    </Modal>
  );
};

export default IosInstallGuide;
