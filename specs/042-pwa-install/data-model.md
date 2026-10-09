# Data Model: Roll6 instalável (PWA)

No server data. Browser-only state:

## Install hint (per device)

- **Where**: `localStorage` key `roll6:install-hint`.
- **Value**: `"shown"` once the one-time install notice appeared on this device (set when it appears, so a reload or a
  dismissal never brings it back).
- **Lifecycle**: unset → notice may appear (phone, logged in, install possible, not installed) → `"shown"` forever.
  Not cleared on logout (it belongs to the device, not to the user). Reads/writes wrapped in try/catch: blocked storage
  means the notice may show again next time, which is acceptable.

## Install state (memory, `InstallContext`)

| Field | Meaning |
|---|---|
| `deferredPrompt` | the captured `beforeinstallprompt` event (Android/desktop Chrome/Edge), null until the browser offers installation and after use/`appinstalled` |
| `standalone` | the app is running installed (`display-mode: standalone` or iOS `navigator.standalone`) |
| `ios` | iPhone/iPad (no install event; instructions instead) |
| `canInstall` | `!standalone && (deferredPrompt !== null || ios)` |
| `guideOpen` | the iOS instructions modal is open |

Actions: `install()` (Android: `deferredPrompt.prompt()` then clear it; iOS: open the guide), `openGuide()` (also for
#39), `closeGuide()`.
