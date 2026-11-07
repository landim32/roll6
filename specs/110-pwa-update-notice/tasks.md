# Tasks: Aviso de nova versão do site

**Input**: Design documents from `/specs/110-pwa-update-notice/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/version.md, quickstart.md

**Tests**: incluídos para os módulos puros (padrão do projeto: Vitest em `lib/`).

**Organization**: US1 aviso + atualizar, US2 não perder trabalho, US3 adiar, US4 arquivos antigos.

## Format: `[ID] [P?] [Story] Description`

Caminhos relativos a `frontend/`.

---

## Phase 1: Setup

- [X] T001 (feito em `src/lib/appVersion.ts`, sem sha do git: não há `@types/node`; id = hora UTC + sufixo aleatório) Criar `appVersion.ts` na raiz de `frontend/` com as funções puras `buildVersion(sha: string | null, date: Date): string` (`{sha}-{yyyyMMddHHmmss}` em UTC, só o timestamp sem sha) e `versionJson(version: string): string` (`JSON.stringify({ version })`), e o teste `src/lib/appVersion.test.ts` (importando `../../appVersion`) cobrindo com e sem sha e o formato do timestamp; incluir `appVersion.ts` no `tsconfig.node.json` (como o `vite.config.ts`) e confirmar que o `include` do Vitest (`src/**/*.test.ts`) pega o teste
- [X] T002 Em `vite.config.ts`: calcular a versão uma vez (`git rev-parse --short HEAD` via `execSync` em try/catch → `null`), `define: { __APP_VERSION__: JSON.stringify(mode === 'production' ? version : 'dev') }` e um plugin `roll6-app-version` com `apply: 'build'` cujo `generateBundle` faz `this.emitFile({ type: 'asset', fileName: 'version.json', source: versionJson(version) })`
- [X] T003 [P] Declarar `declare const __APP_VERSION__: string;` em `src/vite-env.d.ts` e adicionar `__APP_VERSION__: 'test'` ao `define` do bloco `test` (ou `globalThis`) para os testes
- [X] T004 [P] Em `nginx.conf`, antes de `location /assets/`: `location = /version.json { add_header Cache-Control "no-cache"; try_files $uri =404; }`

---

## Phase 2: Foundational

- [X] T005 [P] Criar `src/lib/appUpdate.ts`: `CHECK_INTERVAL_MS = 5 * 60_000`, `SNOOZE_MS = 30 * 60_000`, `MIN_VISIBLE_RECHECK_MS = 15_000`, `isNewVersion(current, published: unknown): boolean` (string não vazia ≠ atual), `parseVersion(body: unknown): string | null` (`{ version }`), `shouldShowNotice({ available, snoozedUntil, now })`, `shouldCheckOnVisible(lastCheckAt, now)`; e `src/lib/appUpdate.test.ts`
- [X] T006 [P] Criar `src/lib/pendingChanges.ts` (registro em módulo: `setPending(key, { dirty, warnOnUnload = true })`, `clearPending(key)`, `hasPending()`, `warnsOnUnload()` = alguma fonte suja com `warnOnUnload` e unload não liberado, `allowUnload()`, `unloadAllowed()`, `resetPendingForTests()`) e `src/lib/pendingChanges.test.ts`
- [X] T007 Criar `src/hooks/usePendingChanges.ts`: `usePendingChanges(key: string, dirty: boolean, options?: { warnOnUnload?: boolean })` — `useEffect` que chama `setPending`/`clearPending` (limpa ao desmontar) e, com `dirty && warnOnUnload !== false`, instala um `beforeunload` que só chama `preventDefault()`/`returnValue = ''` quando `!unloadAllowed()`; chave única por instância com `useId()` quando `key` termina com `:` (ex.: `'leave-guard:'`)

**Checkpoint**: `npm test -- appUpdate pendingChanges appVersion` passa.

---

## Phase 3: User Story 1 - Ser avisado de que há uma versão nova (P1) 🎯 MVP

**Goal**: aviso com "Atualizar" em até 5 min (ou ao voltar ao app) depois de uma publicação.

**Independent Test**: roteiro 1–3 e 6 do `quickstart.md` com `vite preview`.

- [X] T008 [US1] Criar `src/Contexts/UpdateContext.tsx` (+ `src/hooks/useUpdate.ts`): estado `available: boolean`, `snoozedUntil: number | null`, `confirming: boolean`; só ativo com `import.meta.env.PROD`; `check()` = `fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })` → `parseVersion` → `isNewVersion(__APP_VERSION__, …)` (erros ignorados, nunca derruba `available` para false); laço com `setTimeout(CHECK_INTERVAL_MS)` só com `document.visibilityState === 'visible'`; `visibilitychange` → visível: zera `snoozedUntil` e chama `check()` se `shouldCheckOnVisible`; expõe `showNotice` (`shouldShowNotice` recalculado a cada verificação e a cada minuto enquanto adiado), `reload()`, `later()`, `confirming`, `confirmReload()`, `cancelReload()`
- [X] T009 [US1] Em `reload()` do `UpdateContext`: sem `hasPending()` → `allowUnload(); window.location.reload()`; com pendências → `confirming = true` (a confirmação é a US2)
- [X] T010 [US1] Criar `src/components/ui/UpdateNotice.tsx`: cartão `.stm-update-notice` (`role="status"`, `aria-live="polite"`, ícone `ArrowRepeatIcon` de `components/ui/icons`, texto `update.title`, botões `update.reload` (`btn btn-primary btn-sm`) e `update.later` (`btn btn-outline-secondary btn-sm`)), renderizado só com `showNotice`; renderizar `<UpdateNotice />` dentro do `UpdateProvider` (para valer em todas as rotas)
- [X] T011 [US1] Registrar o `UpdateProvider` como o mais externo da cadeia em `src/main.tsx` (acima do `AuthProvider`, dentro do router se precisar de rota — não precisa) e atualizar o comentário da cadeia de providers
- [X] T012 [P] [US1] Estilos em `src/styles/app.css`: `.stm-update-notice { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--stm-footer-height) + 12px); width: min(420px, calc(100vw - 32px)); z-index: 2000; display: flex; align-items: center; gap: .75rem; padding: .6rem .75rem; background: var(--stm-surface-2); border: 1px solid var(--stm-accent); border-radius: var(--stm-radius); box-shadow: var(--stm-shadow); }` (texto `flex: 1`, botões sem quebra); nada de cor hex nova
- [X] T013 [P] [US1] Chaves em `src/i18n/locales/pt-BR.json`: `update.title` "Nova versão do Roll6 disponível", `update.reload` "Atualizar", `update.later` "Depois", `update.confirmTitle` "Atualizar o Roll6", `update.confirmMessage` "Há alterações que ainda não foram salvas. Descartar e atualizar agora?", `update.confirm` "Descartar e atualizar"

**Checkpoint**: aviso aparece e "Atualizar" recarrega quando nada está pendente.

---

## Phase 4: User Story 2 - Não perder trabalho ao atualizar (P1)

**Goal**: com alterações não salvas, "Atualizar" pergunta antes; confirmando, recarrega sem o diálogo nativo.

**Independent Test**: roteiro 5 do `quickstart.md`.

- [X] T014 [US2] Em `src/hooks/useLeaveGuard.tsx`: trocar o `useEffect` de `beforeunload` por `usePendingChanges('leave-guard:', dirty)` (o `useBlocker` continua igual)
- [X] T015 [P] [US2] Em `src/pages/MainPage.tsx`: trocar o `useEffect` de `beforeunload` (`isDirty`) por `usePendingChanges('map-draft', isDirty)`
- [X] T016 [P] [US2] Em `src/pages/library/LibraryLayout.tsx`: trocar o `useEffect` de `beforeunload` por `usePendingChanges('library-map', isDirty && canEdit)`
- [X] T017 [P] [US2] Em `src/components/chat/ChatComposer.tsx`: `usePendingChanges('chat-composer', text.trim().length > 0, { warnOnUnload: false })`
- [X] T018 [US2] Em `src/components/ui/UpdateNotice.tsx`: `ConfirmModal` (já existente em `components/modals/ConfirmModal` ou equivalente — conferir o caminho) aberto por `confirming`, título `update.confirmTitle`, mensagem `update.confirmMessage`, botão `update.confirm` (`danger`); `onConfirm` → `confirmReload()` (`allowUnload(); location.reload()`), fechar → `cancelReload()` (o aviso continua)

**Checkpoint**: nenhum diálogo duplo; cancelar mantém tudo.

---

## Phase 5: User Story 3 - Adiar a atualização (P2)

**Goal**: "Depois" esconde por 30 min ou até voltar ao app; o aviso não cobre a mesa.

**Independent Test**: roteiro 4 e 9 do `quickstart.md`.

- [X] T019 [US3] Em `UpdateContext.later()`: `snoozedUntil = Date.now() + SNOOZE_MS`; um `setInterval` de 60 s (só enquanto há adiamento) recalcula `showNotice`; o `visibilitychange` (T008) zera o adiamento
- [X] T020 [P] [US3] Conferir a posição no celular e no layout dividido em `src/styles/app.css`: abaixo de 768 px, `bottom: calc(var(--stm-footer-height) + 8px)` e botões compactos; se o rodapé não existir na página (login, biblioteca, editor), o `--stm-footer-height` do `:root` mantém a mesma distância

---

## Phase 6: User Story 4 - Telas que não abrem por causa da versão antiga (P2)

**Goal**: falha de import dinâmico com versão nova publicada → aviso.

**Independent Test**: roteiro 7 do `quickstart.md`.

- [X] T021 [US4] Em `src/Contexts/UpdateContext.tsx`: `window.addEventListener('vite:preloadError', handler)`; se `available` já é true → `event.preventDefault()`, zera `snoozedUntil` (o aviso aparece); senão chama `check()` e, quando ela confirmar uma versão nova, zera `snoozedUntil`; sem versão nova o erro segue como hoje
- [X] T022 [P] [US4] Teste em `src/lib/appUpdate.test.ts` da regra `preloadAction(available)` → `'notify'` | `'check'` (função pura extraída para o handler)

---

## Phase 7: Polish

- [X] T023 [P] Documentar em `CLAUDE.md` (seção do app instalável 042 e lista de localStorage/estado): `__APP_VERSION__`, `version.json` (gerado no build, `no-cache` no nginx, precisa ser publicado com o SPA), `UpdateContext`/`UpdateNotice`, `lib/pendingChanges` + `usePendingChanges` como o único lugar de `beforeunload`; adicionar a entrada em "Recent Changes"
- [X] T024 Rodar `npm test`, `npm run lint`, `npm run build` e conferir `dist/version.json`
- [X] T025 (parcial: passos 1–4 e 6 conferidos no Chrome com `vite preview`; 5, 7 e 9 cobertos por testes e não manualmente) Roteiro completo do `quickstart.md` com `npx vite preview`

---

## Dependencies & Execution Order

- Setup (T001–T004) → Foundational (T005–T007) → US1 (T008–T013) → US2 (T014–T018) → US3 (T019–T020) → US4 (T021–T022) → Polish.
- US2 depende de US1 (`UpdateNotice`, `reload`); US3 e US4 dependem só de US1.
- T014–T017 tocam arquivos diferentes e podem andar em paralelo.

## Parallel Examples

```text
T003 | T004 | T005 | T006
T012 | T013   (durante T008–T011)
T015 | T016 | T017   (depois de T007)
```

## Implementation Strategy

1. MVP: Setup + Foundational + US1 + US2 (aviso que nunca perde trabalho).
2. US3 e US4.
3. Commit `fix:`? Não — é um recurso novo completo: `feat: aviso de nova versão do site (110)`.
