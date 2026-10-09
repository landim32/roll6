# UI contracts (038)

No API, MCP or database contract changes. These are the visual contracts the implementation must meet.

## `components/ui/BrandLogo.tsx` (new)

```ts
interface BrandLogoProps {
  variant: 'vertical' | 'horizontal' | 'symbol';
  /** Rendered height in px (width follows the aspect ratio). Defaults: vertical 160, horizontal 40, symbol 32. */
  height?: number;
  className?: string;
}
```

- Renders `<img src="/brand/roll6-{variant}.png" alt="Roll6" width height decoding="async">` (PNG only — the 256-color PNGs are smaller than WebP, research D4), with `width` from the source aspect (vertical 1263:1245, horizontal 2043:770, symbol 1:1).
- On image error: renders `<span className="stm-brand-text">{t('common.appName')}</span>` instead (FR-012).
- Never stretches: `object-fit: contain`, `max-width: 100%`.

## `LoginPage` (redesigned, same behavior)

- Structure: `.stm-login` (full-height background: `--stm-bg` + radial green glow + hex outline pattern) → `BrandLogo variant="vertical"` (160 px; 120 px below 768 px) → `.stm-login-card` (surface, border, `--stm-radius`, `--stm-shadow`, 3 px top strip `linear-gradient(90deg, --stm-accent, --stm-accent-2)`) containing the same `Tabs`, fields, hints and submit button as today.
- The `<h1>` stays for accessibility, visually hidden (`visually-hidden`), with text `Roll6`.
- No change to `handleSubmit`, validation, toasts, redirects, `autoComplete` or field ids.

## `TopMenu`

- First child: `<a>`/`<span className="stm-menu-brand">` containing `BrandLogo variant="horizontal" height={32}` (`d-none d-md-inline-flex`) and `BrandLogo variant="symbol" height={32}` (`d-md-none`). Replaces `<span className="stm-brand">`.
- `--stm-menu-height` stays 56 px (desktop) / 100 px (phones); the brand fits within it.

## Colors anywhere

- Primary buttons, `.btn-success`, active tabs/pills/dropdown items, focus rings, checked inputs, links, progress bars, success toasts, the Mover "ok" path and the resize frame use `--stm-accent`. Text on them uses `--stm-on-accent`.
- Danger, warning, info and the piece discs (character blue, NPC red, object gray) keep their current colors.
- No `#d4a24c` remains in `frontend/src`.

## `index.html`

```html
<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/brand/favicon-48.png" />
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
<meta name="theme-color" content="#0b1220" />
```
