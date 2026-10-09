/**
 * Work that must happen while the session still exists, right before logging out (043: this device stops receiving
 * notifications). Hooks run synchronously at the start of `logout`, so any request they start still carries the token;
 * they must never throw nor block the logout.
 */
type Hook = () => void;

const hooks = new Set<Hook>();

export const registerBeforeLogout = (hook: Hook): (() => void) => {
  hooks.add(hook);
  return () => {
    hooks.delete(hook);
  };
};

export const runBeforeLogout = (): void => {
  hooks.forEach((hook) => {
    try {
      hook();
    } catch {
      // Never stop the logout.
    }
  });
};
