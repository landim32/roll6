# Research: 110-pwa-update-notice

## R1 — Como saber que há uma versão nova

- **Decision**: arquivo estático `version.json` gerado no build, com o mesmo id embutido no bundle (`__APP_VERSION__`).
  A aba compara os dois.
- **Rationale**: o service worker do Roll6 não guarda cache nem intercepta requisições (042), então o fluxo clássico
  "SW em espera → skipWaiting" não serve: não há o que ativar. Um arquivo pequeno publicado junto com o SPA funciona
  igual em homolog e produção, em navegador e no app instalado.
- **Alternatives**:
  - comparar o `index.html` (o nome do bundle muda): baixa ~2 KB a cada vez e depende do HTML gerado;
  - versionar o `sw.js` e usar `updatefound`: o `sw.js` não muda a cada build, e teria de ser reescrito a cada build;
  - avisar pelo SignalR: só a API sabe de deploys da API, não do SPA, que é publicado à parte.

## R2 — Id da build

- **Decision**: `{sha curto}-{yyyyMMddHHmmss}`; sem git disponível (build em container sem `.git`), só o timestamp. Função
  pura `appVersion.ts` (`buildVersion(sha, date)`) usada pelo plugin, testada no Vitest.
- **Rationale**: dois builds do mesmo commit também ficam diferentes (republicação), e o id é legível para depurar.

## R3 — Quando verificar

- **Decision**: a cada 5 min (`CHECK_INTERVAL_MS`) com `setTimeout` reprogramado, só com a aba visível; imediatamente no
  `visibilitychange` → visível (com intervalo mínimo de 15 s para não repetir em alternâncias rápidas); imediatamente
  num `vite:preloadError`. `fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })`; qualquer falha (rede, 404,
  JSON inválido, sem `version`) é ignorada.
- **Rationale**: cumpre SC-001 (5 min / 5 s) sem custo em segundo plano; o `?t=` e `no-store` evitam caches do
  navegador, da Cloudflare e do nginx de produção, cuja configuração não está no repositório.

## R4 — "Depois"

- **Decision**: `snoozedUntil = agora + 30 min` só em memória. O aviso volta quando o prazo vence (verificado na
  própria verificação periódica) ou no próximo `visibilitychange` para visível (que zera o adiamento).
- **Rationale**: FR-006; nada a guardar: recarregar a página já resolve o aviso.

## R5 — Proteger alterações não salvas

- **Decision**: registro puro `lib/pendingChanges` com fontes nomeadas (`set(key, { dirty, warnOnUnload })`,
  `remove(key)`, `hasPending()`, `allowUnload()`, `unloadAllowed()`), e o hook `usePendingChanges(key, dirty, options)`
  que registra a fonte e instala o `beforeunload` (pulado quando `unloadAllowed()`). Ele substitui os três
  `beforeunload` atuais:
  - `hooks/useLeaveGuard` (páginas da biblioteca, editor de animação, gerador de mapas);
  - `pages/MainPage` (rascunho do mapa, `isDirty`);
  - `pages/library/LibraryLayout` (rascunho do mapa aberto dentro da biblioteca).
  O `ChatComposer` registra `text.trim() !== ''` com `warnOnUnload: false` (hoje fechar a aba não pergunta nada sobre o
  chat, e isso não muda).

  "Atualizar": sem pendências → `location.reload()`; com pendências → `ConfirmModal` "Descartar alterações e
  atualizar?" → `allowUnload()` + `location.reload()`.
- **Rationale**: o `useBlocker` do React Router não pega um `reload`; os `beforeunload` sozinhos dariam o diálogo nativo
  do navegador (sem texto próprio e, no app instalado do iOS, nem aparece). Um único ponto de verdade também evita a
  pergunta em dobro (nossa + a do navegador).
- **Alternatives**: salvar automaticamente antes de recarregar (fora do escopo, e o mapa às vezes pede nome);
  reaproveitar o modal Salvar/Descartar/Cancelar do mapa (só cobre o mapa).

## R6 — Onde fica o aviso

- **Decision**: cartão fixo `.stm-update-notice` no centro inferior, acima do rodapé (`bottom: calc(var(--stm-footer-height,
  32px) + var(--stm-safe-bottom, 0px) + 12px)`), largura até 420 px (16 px de margem no celular), `z-index` acima dos modais
  Radix e dos toasts, `role="status"` + `aria-live="polite"`. Textos: `update.title` "Nova versão do Roll6 disponível",
  `update.reload` "Atualizar", `update.later` "Depois", `update.confirmTitle`, `update.confirmMessage`.
- **Rationale**: o canto inferior direito é dos botões do mapa, os lados são dos painéis, o topo é do menu; no layout
  dividido o chat fica à direita (desktop) ou embaixo (celular). Em cima do chat no celular dividido, o cartão sobe
  sobre a fronteira mapa/chat; ainda assim não cobre o campo de texto (fica acima do rodapé do mapa). Conferir no roteiro.
- **Alternatives**: toast do `sonner` (some sozinho ou fica empilhado com outros; precisa de duas ações).

## R7 — `vite:preloadError`

- **Decision**: `window.addEventListener('vite:preloadError', handler)` no `UpdateContext`: verifica já; com versão nova,
  `event.preventDefault()` e mostra o aviso (sem adiamento); sem versão nova, deixa o erro seguir.
- **Rationale**: é o evento que o Vite dispara quando um import dinâmico falha — exatamente o caso de chunks antigos
  removidos. Como a verificação é assíncrona, o `preventDefault` só pode ser decidido na hora: o handler chama
  `preventDefault()` sempre que houver uma versão nova **já conhecida**, e dispara a verificação nos outros casos (a
  falha original segue para o erro de hoje).
