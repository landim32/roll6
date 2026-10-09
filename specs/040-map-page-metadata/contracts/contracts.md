# Contracts (040)

## `GET /api/meta/head/{**path}` — anonymous

Returns the `<head>` fragment for the page at `/{path}` (query string ignored). Always `200 text/html; charset=utf-8`; never an error body (any failure → generic fragment).

```html
<meta name="description" content="Campanha A Torre, mestre Rodrigo. Mapa 30×20 hexágonos.">
<link rel="canonical" href="https://roll6.site/map/estrada-1">
<meta property="og:site_name" content="Roll6">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Estrada 1 — A Torre">
<meta property="og:description" content="Campanha A Torre, mestre Rodrigo. Mapa 30×20 hexágonos.">
<meta property="og:url" content="https://roll6.site/map/estrada-1">
<meta property="og:image" content="https://roll6.site/api/meta/image/map/estrada-1.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="Mapa Estrada 1">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Estrada 1 — A Torre">
<meta name="twitter:description" content="Campanha A Torre, mestre Rodrigo. Mapa 30×20 hexágonos.">
<meta name="twitter:image" content="https://roll6.site/api/meta/image/map/estrada-1.jpg">
```

| Path | Content |
|---|---|
| `map/{slug}` (exists, not deleted) | map + campaign |
| `campaign/{slug}` (exists) | campaign + current map image (or brand image) |
| anything else / unknown / deleted | generic (`og:image` = `/brand/og-default.png`, 1200×630 PNG) |

## `GET /api/meta/image/map/{slug}.jpg` — anonymous

- `200 image/jpeg`, 1200×630, `Cache-Control: public, max-age=604800`.
- Map unknown/deleted or model without image → `302` to `/brand/og-default.png`.

Both endpoints are added to `McpToolCatalog.EXCLUDED` (no MCP tool; coverage stays 86/87). No other endpoint changes.

## nginx (homolog `frontend/nginx.conf`; production shared nginx — document)

```nginx
location / {
    ssi on;
    add_header Cache-Control "no-cache";
    try_files $uri $uri/ /index.html;
}
```

## `frontend/index.html` `<head>`

```html
<title>Roll6</title>
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/brand/favicon-48.png" />
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
<meta name="theme-color" content="#0b1220" />
<!--# block name="roll6_meta" --><meta property="og:site_name" content="Roll6"><meta property="og:title" content="Roll6"><meta property="og:image" content="/brand/og-default.png"><!--# endblock -->
<!--# include virtual="/api/meta/head$request_uri" stub="roll6_meta" -->
```

## Frontend `lib/documentTitle.ts`

```ts
export interface DocumentTitleInput { mapName: string | null; campaignName: string | null; isCampaignMap: boolean }
export const documentTitle: (input: DocumentTitleInput) => string; // "{map} — {campaign} | Roll6" | "{model} | Roll6" | "{campaign} | Roll6" | "Roll6"
```
