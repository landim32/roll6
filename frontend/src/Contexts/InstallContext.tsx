import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { canOfferInstall, currentEnvironment, isIos, isIosSafari, isStandalone } from '../lib/install';

/** Chrome/Edge's install offer (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallContextType {
  /** "Instalar o Roll6" can be offered right now. */
  canInstall: boolean;
  /** Running as the installed app. */
  standalone: boolean;
  ios: boolean;
  iosSafari: boolean;
  /** Android/desktop: the system install dialog; iOS: the instructions. Only ever called from a user's tap. */
  install: () => Promise<void>;
  /** The iOS instructions window (#39 opens it before offering notifications). */
  guideOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
}

const InstallContext = createContext<InstallContextType | undefined>(undefined);

/**
 * The installable app (042). Keeps the browser's install offer (`beforeinstallprompt`, held back so the browser never
 * shows it by itself) until the user taps "Instalar o Roll6", follows whether the app runs installed, and owns the iOS
 * instructions window.
 */
export const InstallProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [env] = useState(currentEnvironment);
  const [standalone, setStandalone] = useState(() => isStandalone(env));
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const ios = isIos(env);
  const iosSafari = isIosSafari(env);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Held: the system dialog only opens from the user's tap (FR-004).
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPrompt(null);
      toast.success(t('install.installed'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
    const onDisplay = () => setStandalone(isStandalone(currentEnvironment()));
    media?.addEventListener('change', onDisplay);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener('change', onDisplay);
    };
  }, [t]);

  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const install = useCallback(async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice.catch(() => undefined);
      // An offer can be used once; the browser fires a new one if installing is still possible.
      setPrompt(null);
      return;
    }
    if (ios) setGuideOpen(true);
  }, [prompt, ios]);

  const canInstall = canOfferInstall({ standalone, ios, hasPrompt: prompt !== null });

  const value = useMemo<InstallContextType>(() => ({
    canInstall, standalone, ios, iosSafari, install, guideOpen, openGuide, closeGuide,
  }), [canInstall, standalone, ios, iosSafari, install, guideOpen, openGuide, closeGuide]);

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
};

export default InstallContext;
