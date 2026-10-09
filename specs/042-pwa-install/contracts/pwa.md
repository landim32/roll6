# Contracts: Roll6 instalável (PWA)

## 1. `/manifest.webmanifest` (static, `application/manifest+json`, no-cache)

```json
{
  "id": "/",
  "name": "Roll6",
  "short_name": "Roll6",
  "description": "Mesa virtual simples para RPG com mapas hexagonais.",
  "lang": "pt-BR",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "icons": [
    { "src": "/brand/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/brand/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/brand/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/brand/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## 2. `/sw.js` (static JavaScript, `Cache-Control: no-cache`)

- `install` → `self.skipWaiting()`.
- `activate` → delete every Cache Storage entry (defensive: this SW never creates one) and `self.clients.claim()`.
- **No `fetch` listener**: the SW never intercepts requests — HTML, `/assets`, `/api`, `/hubs`, `/mcp`, images and
  audio all go to the network exactly as without it.
- `push` / `notificationclick` are **not** part of this feature (#39 adds them).

Registration (`lib/serviceWorker.ts`): only when `import.meta.env.PROD` and `'serviceWorker' in navigator`, on
`window` `load`: `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })`, then
`registration.update()`. Errors are logged with `console.warn` and ignored.

## 3. `index.html` head additions

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Roll6" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
and the viewport gains `viewport-fit=cover` (the existing `theme-color` and `apple-touch-icon` stay).

## 4. nginx (homolog `frontend/nginx.conf`; same blocks for the production nginx)

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

## 5. UI

| Element | Where | Shown when | Action |
|---|---|---|---|
| "Instalar o Roll6" item | `UserMenu` (Radix Dropdown) | `canInstall` | Android/desktop: system install dialog; iOS: opens `IosInstallGuide` |
| `IosInstallGuide` | Modal (`components/ui/Modal`) | `guideOpen` | Steps with icons: 1. "Compartilhar" (box-arrow-up) 2. "Adicionar à Tela de Início" (plus-square) 3. open "Roll6" from the home screen; non-Safari iOS browsers get a note to use Safari / the browser's share menu; "Entendi" closes |
| `InstallHint` | Fixed small card, bottom, above footer/composer (`role="status"`) | logged in, phone, `canInstall`, `roll6:install-hint` unset, no modal open | "Instalar" → same as the menu item; "Agora não"/✕ → closes; appearing sets `roll6:install-hint = "shown"` |

`useInstall()` exposes `{ canInstall, standalone, ios, install, openGuide, closeGuide, guideOpen }`; `openGuide` is the
entry point #39 will call before offering notifications.

i18n keys (`install.*`): `menu`, `hintTitle`, `hintText`, `hintInstall`, `hintLater`, `guideTitle`, `guideStep1`,
`guideStep2`, `guideStep3`, `guideOtherBrowser`, `guideClose`, `installed`.
