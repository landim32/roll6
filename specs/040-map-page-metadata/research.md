# Research: Metadados do mapa e favicon da marca (040)

Nenhum `NEEDS CLARIFICATION` ficou aberto. Contexto do código: SPA React servida como arquivos estáticos (homolog: nginx do container `web`, `frontend/nginx.conf`; produção: nginx compartilhado do servidor, fora do repositório), `index.html` igual para toda rota, imagens no bucket com URLs pré-assinadas de **60 minutos** (`S3:UrlExpirationMinutes`) e mapas legíveis só com login (`GET /api/map/slug/{slug}`).

## D1 — Como os robôs de prévia recebem os metadados (FR-004)

Robôs de prévia (WhatsApp, Telegram, Facebook, X, Slack, Discord) leem só o HTML inicial, sem executar JavaScript. A SPA precisa entregar as tags `og:*`/`twitter:*` **no HTML** da rota `/map/{slug}`.

- **Decision**: **SSI do nginx** com um fragmento gerado pela API.
  - O `index.html` ganha, no `<head>`, um bloco padrão e um include:
    `<!--# block name="roll6_meta" -->…tags genéricas…<!--# endblock --><!--# include virtual="/api/meta/head$request_uri" stub="roll6_meta" -->`
  - O nginx (`ssi on;` em `location /`) substitui o include pela resposta de `GET /api/meta/head/{**path}`. Se a API falhar, usa o bloco genérico (`stub`).
  - Usa-se `$request_uri`, não `$uri`, porque depois do `try_files … /index.html` o `$uri` já virou `/index.html`.
  - No Vite (dev) e em qualquer servidor sem SSI, as diretivas são comentários HTML e não fazem nada. O título da aba continua vindo do JavaScript.
- **Rationale**: nenhum container ou serviço novo, nenhum desvio por user-agent, a mesma resposta para pessoas e robôs (sem "cloaking"), e o nginx já está na frente em homolog e produção. O custo é uma subrequisição leve por carregamento de página.
- **Alternatives considered**:
  - Detectar robôs pelo user-agent e mandá-los para a API: lista frágil, e é cloaking.
  - A API servir o `index.html` inteiro: o container da API não tem o build do frontend.
  - Pré-renderizar: os mapas são dinâmicos.
  - Mover o SPA para o ASP.NET: muda o deploy.
- **Produção**: o nginx compartilhado precisa de `ssi on;` no `location /` do Roll6. A linha fica documentada em `CLAUDE.md`, junto do `try_files` que já está documentado lá.

## D2 — Endpoints anônimos de metadados (FR-001..FR-005, FR-008, FR-010)

- **Decision**: novo `MetaController` (`[AllowAnonymous]`), com o serviço de domínio `PageMetaService` e o formatador puro `Domain/Meta/PageMetaHtml`:
  - `GET /api/meta/head/{**path}` → `text/html; charset=utf-8`, só o fragmento de tags. `/map/{slug}` gera o mapa; `/campaign/{slug}` gera a campanha (com a imagem do mapa atual, se houver); qualquer outra rota, ou slug inexistente ou apagado, gera a prévia genérica. Nunca devolve erro: falha interna também vira a genérica, para o SSI não mostrar nada quebrado.
  - Tags: `og:site_name` "Roll6", `og:type` "website", `og:locale` "pt_BR", `og:title`, `og:description`, `og:url` e `<link rel="canonical">` (FR-011), `og:image` (+ `og:image:width`/`height`/`type`/`alt`), `twitter:card` "summary_large_image", `twitter:title`/`description`/`image` e `<meta name="description">`.
  - Título: "{mapa} — {campanha}" (≤ 70 caracteres). Descrição: "Campanha {campanha}, mestre {nome}. Mapa {L}×{A} hexágonos." (≤ 200). Os dois são cortados em palavra com "…". Todo valor passa por `HtmlEncoder` (FR-008).
  - Só esses campos aparecem. Nenhuma peça, NPC, ficha ou turno (FR-005), e nenhum endpoint existente muda (FR-010).
- **Rationale**: o domínio decide o conteúdo (testável sem HTTP) e o controller só serve.

## D3 — Imagem da prévia estável e leve (FR-007, edge cases)

As URLs pré-assinadas expiram em 60 min, e os aplicativos guardam a prévia por dias. Além disso, o WhatsApp descarta imagens grandes (na prática, acima de algumas centenas de KB), e as imagens de mapa chegam a 10 MB.

- **Decision**: `GET /api/meta/image/map/{slug}.jpg` (anônimo) devolve um **JPEG de 1200×630** (proporção 1.91:1 das prévias), com a imagem do mapa reduzida para caber inteira sobre o fundo `#0b1220`, qualidade 80, normalmente entre 80 e 250 KB. Envia `Cache-Control: public, max-age=604800` (7 dias). A URL é estável porque o slug é imutável (029).
  - O JPEG é gerado com **SkiaSharp** (`SkiaSharp` + `SkiaSharp.NativeAssets.Linux.NoDependencies` para o container Debian sem libs nativas extras) num `IPreviewImageRenderer` do Infra.
  - Fica em `IMemoryCache` com limite de tamanho (≈ 32 MB, entradas pela chave `{fileName}`, expiração deslizante de 1 dia). Imagem nova significa chave nova.
  - Mapa sem imagem ou inexistente responde `302` para `/brand/og-default.png`.
- **Rationale**: atende a validade de 7 dias e o peso, sem gravar arquivos derivados no bucket (que é write-once, 032).
- **Alternatives considered**:
  - Servir a imagem original: pesada demais para o WhatsApp.
  - Gerar a miniatura no navegador ao salvar o mapa: precisaria de coluna nova e não cobriria mapas antigos.
  - ImageSharp: licença Six Labors.
  - Gravar a miniatura no bucket: arquivos derivados e limpeza.
- **Dependência nova**: justificada em *Complexity Tracking*.

## D4 — URLs absolutas

- **Decision**: `og:url`, `og:image` e `canonical` precisam de URL absoluta. Vêm da configuração nova `Site:BaseUrl` (`appsettings.Production.json`: `https://roll6.site`; Docker/homolog: vazio). Se estiver vazia, a URL é montada com o `X-Forwarded-Proto`/`Host` da requisição (o nginx já repassa `Host` e `X-Forwarded-Proto`). Sem a imagem da marca nem do mapa, nunca se usa caminho relativo.

## D5 — Título da aba (FR-006)

- **Decision**: função pura `lib/documentTitle.ts` → `documentTitle({ mapName, campaignName, isCampaignMap })` = "{mapa} — {campanha} | Roll6", "{modelo} | Roll6", "{campanha} | Roll6" ou "Roll6". Ela é aplicada por um hook `hooks/useDocumentTitle` chamado no `MainPage` (lê `draft.name`, `draft.campaignId` e `currentCampaign`) e volta a "Roll6" no logout e no `LoginPage`. Não há prefixo de i18n, porque os nomes são do usuário.

## D6 — Favicon (FR-009)

- **Decision**: gerar uma vez (Pillow, script descartável), a partir do símbolo recortado de `docs/logomarca/roll6-horizontal-escuro.png` (coluna 0–683), os arquivos de `frontend/public/`:
  - `favicon.ico` com 16/32/48, servido no endereço padrão `/favicon.ico`;
  - `brand/favicon-32.png` e `brand/favicon-48.png`;
  - `brand/apple-touch-icon.png` com 180×180 sobre `#0b1220`;
  - `brand/og-default.png` com 1200×630, a logo horizontal centralizada sobre `#0b1220` (a prévia genérica).

  Os PNG usam paleta de 256 cores, como na 038. No `index.html`, entram as `<link rel="icon">`/`apple-touch-icon` e `<meta name="theme-color" content="#0b1220">`.
- **Rationale**: mesmos nomes e caminhos da 038. Se ela for mergeada antes, os PNG coincidem e o conflito fica só no `index.html`.

## D7 — Indexação (FR-011)

- **Decision**: nenhum `noindex`, e o `canonical` aponta para a própria rota. Não se cria `robots.txt` restritivo.

## D8 — MCP

- **Decision**: os dois endpoints novos são para robôs de prévia, não para assistentes. Entram em `McpToolCatalog.EXCLUDED` (ao lado das operações só de login), e `McpCoverageTests` continua com 86 operações cobertas e 87 ferramentas.
