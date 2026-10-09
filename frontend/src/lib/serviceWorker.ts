/**
 * Registers the installable app's service worker (042, `public/sw.js`) — production builds only, so `npm run dev`
 * and Vite's hot reload are never touched. The worker caches nothing; `updateViaCache: 'none'` plus `update()` on each
 * load make the browser fetch `sw.js` fresh every time, so a deploy that changes it is picked up at once.
 */
export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((err: unknown) => console.warn('[Roll6] service worker not registered', err));
  });
};
