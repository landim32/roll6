# Quickstart: Roll6 instalável (PWA)

## Build and check locally

```bash
cd frontend
npm test -- install          # pure rules
npm run build
npx vite preview --port 4173 # production build on localhost (service worker active; localhost counts as secure)
```

In Chrome DevTools → Application: the Manifest shows name/icons/no errors ("Installability" clean), the Service Worker
`/sw.js` is activated and Cache Storage stays empty. Network: `/api/*` and `/hubs/*` requests show no "(ServiceWorker)"
source. In `npm run dev` no service worker is registered.

## Production nginx (outside the repo — apply on the server)

Add to the Roll6 `server` block, before `location /`:

```nginx
location = /sw.js {
    add_header Cache-Control "no-cache";
    add_header Service-Worker-Allowed "/";
    try_files $uri =404;
}

location = /manifest.webmanifest {
    default_type application/manifest+json;
    add_header Cache-Control "no-cache";
    try_files $uri =404;
}
```

Check: `curl -sI https://roll6.site/sw.js` → `200`, JavaScript content type, `Cache-Control: no-cache`;
`curl -sI https://roll6.site/manifest.webmanifest` → `application/manifest+json`.

## Manual pass

1. **Android (Chrome)**: log in → the one-time notice appears at the bottom → "Agora não" → reload: it doesn't return;
   user menu → "Instalar o Roll6" → system dialog → install → open from the icon: full screen, navy splash with the
   symbol, the table works (move a piece, chat, finish a turn with another device).
2. **iPhone (Safari)**: log in → notice → "Instalar" opens the guide; follow it → open "Roll6" from the home screen:
   full screen, no Safari bars, menu below the notch; the menu no longer shows "Instalar o Roll6" (log in again if iOS
   asks — separate storage).
3. **Deploy update**: with the app installed, deploy a visible change; close and open the app (twice at most): the
   change shows.
4. **Links**: open `https://roll6.site/map/{slug}` with the app installed (Android) → it opens in the app on that map.
