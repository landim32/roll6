/**
 * Pure rules of the installable app (042): which device this is, whether the app already runs installed, whether
 * "Instalar o Roll6" can be offered and whether the one-time phone notice may appear. Browser values are passed in so
 * every rule is testable.
 */

/** "shown" once the one-time install notice appeared on this device (never cleared: it belongs to the device). */
export const INSTALL_HINT_KEY = 'roll6:install-hint';

export interface InstallEnvironment {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  /** `(display-mode: standalone)` matches. */
  standaloneMedia: boolean;
  /** iOS Safari's `navigator.standalone` (true when opened from the home screen). */
  navigatorStandalone?: boolean;
}

/** iPhone/iPad/iPod — including iPadOS, which reports itself as a Mac with a touch screen. */
export const isIos = (env: InstallEnvironment): boolean =>
  /iPhone|iPad|iPod/i.test(env.userAgent) || (env.platform === 'MacIntel' && env.maxTouchPoints > 1);

/** Safari on iOS: the other iOS browsers (Chrome, Firefox, Edge, Opera) add their own token to the user agent. */
export const isIosSafari = (env: InstallEnvironment): boolean =>
  isIos(env) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(env.userAgent);

/** Running as the installed app (Android/desktop display mode, or opened from the iOS home screen). */
export const isStandalone = (env: InstallEnvironment): boolean => env.standaloneMedia || env.navigatorStandalone === true;

export interface OfferConditions {
  standalone: boolean;
  ios: boolean;
  hasPrompt: boolean;
}

/** "Instalar o Roll6" can be offered: not installed, and the browser offered installation (or iOS: instructions). */
export const canOfferInstall = ({ standalone, ios, hasPrompt }: OfferConditions): boolean => !standalone && (ios || hasPrompt);

export interface HintConditions {
  canInstall: boolean;
  phone: boolean;
  loggedIn: boolean;
  hintShown: boolean;
  modalOpen: boolean;
}

/** The one-time notice: phones only, after login, while installing is possible, never twice, never over a window. */
export const shouldShowHint = ({ canInstall, phone, loggedIn, hintShown, modalOpen }: HintConditions): boolean =>
  canInstall && phone && loggedIn && !hintShown && !modalOpen;

export const readHintShown = (): boolean => {
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) === 'shown';
  } catch {
    return false;
  }
};

export const markHintShown = (): void => {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, 'shown');
  } catch {
    // Storage blocked: the notice may show again next time, which is harmless.
  }
};

/** The current browser's values. */
export const currentEnvironment = (): InstallEnvironment => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  maxTouchPoints: navigator.maxTouchPoints ?? 0,
  standaloneMedia: typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches,
  navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
});
