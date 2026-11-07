# Implementation Plan: Aviso de nova versão do site

**Branch**: `110-pwa-update-notice` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/110-pwa-update-notice/spec.md`

## Summary

Frontend apenas, sem dependência nova.

- **Versão**: um plugin pequeno em `vite.config.ts` gera um id por build (`{sha curto do git}-{timestamp}`), embute-o como
  `__APP_VERSION__` (`define`) e grava `dist/version.json` (`{ "version": "…" }`).
- **Verificação**: `Contexts/UpdateContext` (no topo da cadeia de providers, acima do `AuthProvider`, para valer também
  no login) busca `/version.json?t=…` com `cache: 'no-store'` a cada 5 min enquanto `document.visibilityState === 'visible'`
  e no `visibilitychange` para visível. Regras puras em `lib/appUpdate` (`isNewVersion`, `nextCheckDelay`,
  `shouldShowNotice` com o adiamento de 30 min). Desligado fora de `import.meta.env.PROD`.
- **Arquivos antigos**: o evento `vite:preloadError` (import dinâmico que falhou) dispara uma verificação imediata; com
  versão nova, mostra o aviso e chama `preventDefault()`; sem versão nova, o erro segue como hoje.
- **Aviso**: `components/ui/UpdateNotice` (cartão fixo embaixo, no centro, acima do rodapé, z-index acima dos modais,
  respeitando `--stm-safe-bottom`), com "Atualizar" e "Depois".
- **Alterações pendentes**: um registro puro `lib/pendingChanges` (fontes nomeadas, cada uma com `dirty` e se avisa o
  navegador ao fechar) e o hook `hooks/usePendingChanges(key, dirty, { warnOnUnload })`, que substitui os três
  `beforeunload` atuais (`useLeaveGuard`, `MainPage`, `LibraryLayout`) e cobre o texto do chat (`ChatComposer`, sem aviso
  do navegador). "Atualizar" com algo pendente abre um `ConfirmModal` ("Descartar alterações e atualizar?"); ao
  confirmar, `allowUnload()` libera os `beforeunload` e a página recarrega (`location.reload()`).
- **Servidor**: `frontend/nginx.conf` ganha `location = /version.json` com `Cache-Control: no-cache` (homolog); a
  produção não precisa de mudança porque a busca já ignora caches, mas o arquivo precisa ser publicado junto com o SPA.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (Vite 6)
**Primary Dependencies**: as existentes (React Router 6.30 data router, Bootstrap 5.3, i18next, sonner,
`@radix-ui/react-dialog` via `ConfirmModal`). **Nenhuma dependência nova.**
**Storage**: nenhuma. Estado só na memória da aba.
**Testing**: Vitest para `lib/appUpdate`, `lib/pendingChanges` e o plugin de versão (função pura que monta o id e o JSON);
`i18n/keys.test.ts`.
**Target Platform**: SPA (navegador e app instalado); nginx de homolog.
**Project Type**: web application (só o frontend muda).
**Performance Goals**: 1 GET de ~40 bytes a cada 5 min por aba visível; nada em segundo plano (SC-001, edge case de carga).
**Constraints**: o service worker continua sem cache nem `fetch` listener (042); nenhum aviso em `npm run dev`; nunca
recarrega sem a pessoa pedir.
**Scale/Scope**: cerca de 4 arquivos novos e 8 alterados no frontend, 1 bloco no `nginx.conf`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | Sem entidade nova; o `UpdateContext` segue o padrão de contexto + hook da `react-architecture` (sem service de API: o arquivo é estático). | PASS |
| II. Stack fixa | Fetch API, Context API, Bootstrap; nenhuma dependência; sem docker local. | PASS |
| III. Casing | `Contexts/UpdateContext.tsx`, `hooks/useUpdate.ts`, `hooks/usePendingChanges.ts`, `lib/…`. | PASS |
| IV. Convenções | `interface`, constantes em vez de `enum`, textos via i18next, feedback na tela (o aviso é um componente fixo, não um toast, por ser persistente e ter duas ações). | PASS |
| V. Banco | Não se aplica. | PASS |
| VI. Auth | O token continua no localStorage; recarregar mantém a sessão. `version.json` é público e só tem o id da build. | PASS |
| VII. Grid | Não se aplica. | PASS |

Post-design re-check: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/110-pwa-update-notice/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/version.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code

```text
frontend/
├── vite.config.ts                       # plugin appVersion (define + version.json)
├── appVersion.ts                        # função pura buildVersion() / versionJson() usada pelo plugin (testável)
├── nginx.conf                           # location = /version.json (no-cache)
└── src/
    ├── vite-env.d.ts                    # declare const __APP_VERSION__: string
    ├── lib/appUpdate.ts (+ .test.ts)    # isNewVersion, shouldShowNotice, SNOOZE_MS, CHECK_INTERVAL_MS
    ├── lib/pendingChanges.ts (+ .test.ts)  # registro de fontes pendentes + allowUnload
    ├── hooks/usePendingChanges.ts       # registra a fonte e o beforeunload
    ├── hooks/useUpdate.ts
    ├── Contexts/UpdateContext.tsx       # verificação, preloadError, estado do aviso, reload
    ├── components/ui/UpdateNotice.tsx   # cartão + ConfirmModal
    ├── hooks/useLeaveGuard.tsx          # usa usePendingChanges
    ├── pages/MainPage.tsx               # idem (rascunho do mapa)
    ├── pages/library/LibraryLayout.tsx  # idem
    ├── components/chat/ChatComposer.tsx # texto não enviado (sem aviso do navegador)
    ├── main.tsx                         # UpdateProvider no topo
    ├── styles/app.css                   # .stm-update-notice
    └── i18n/locales/pt-BR.json          # update.*
```

**Structure Decision**: só o frontend, na estrutura atual.

## Complexity Tracking

Nenhuma violação.
