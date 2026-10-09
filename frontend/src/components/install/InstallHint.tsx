import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadIcon } from '../ui/icons';
import { useInstall } from '../../hooks/useInstall';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { markHintShown, readHintShown, shouldShowHint } from '../../lib/install';

/** Phones (Bootstrap's `md` breakpoint), where the notice is offered. */
const PHONE_QUERY = '(max-width: 767.98px)';

/**
 * The one-time install notice (042, clarification B): on phones, once per device, after login, while installing is
 * possible — a small card at the bottom that never blocks the table. "Instalar" does what the user menu item does
 * (system dialog on Android, guide on iOS); "Agora não" or ✕ close it, and it never comes back on this device.
 */
export const InstallHint = () => {
  const { t } = useTranslation();
  const { canInstall, install, guideOpen } = useInstall();
  const phone = useMediaQuery(PHONE_QUERY);
  // Read once: once shown on this device it never shows again, even after a reload.
  const [alreadyShown] = useState(readHintShown);
  const [closed, setClosed] = useState(false);

  const visible = !closed && shouldShowHint({ canInstall, phone, loggedIn: true, hintShown: alreadyShown, modalOpen: guideOpen });

  // Appearing is what counts: a reload or leaving the page doesn't bring it back.
  useEffect(() => {
    if (visible) markHintShown();
  }, [visible]);

  if (!visible) return null;

  const onInstall = () => {
    setClosed(true);
    void install();
  };

  return (
    <div className="stm-install-hint" role="status">
      <span className="stm-install-hint-icon" aria-hidden="true"><DownloadIcon size={20} /></span>
      <div className="stm-install-hint-text">
        <strong>{t('install.hintTitle')}</strong>
        <span>{t('install.hintText')}</span>
      </div>
      <div className="stm-install-hint-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={onInstall}>{t('install.hintInstall')}</button>
        <button type="button" className="btn btn-sm btn-link" onClick={() => setClosed(true)}>{t('install.hintLater')}</button>
      </div>
      <button type="button" className="btn-close stm-install-hint-close" onClick={() => setClosed(true)}
        aria-label={t('install.hintClose')} title={t('install.hintClose')} />
    </div>
  );
};

export default InstallHint;
