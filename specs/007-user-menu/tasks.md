# Tasks: Submenu do Usuário (Editar, Trocar senha, Sair)

**Input**: Design documents from `/specs/007-user-menu/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; incluído apenas o teste Vitest das validações puras (`lib/userForms.ts`),
seguindo o padrão do projeto de testar `lib/`.

**Organization**: tarefas agrupadas por user story. Todos os caminhos são relativos a `frontend/`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Instalar `@radix-ui/react-dropdown-menu` (`npm install @radix-ui/react-dropdown-menu`), registrando-o em `frontend/package.json` e `frontend/package-lock.json`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: o submenu, que é o ponto de entrada das três histórias.

- [X] T002 Adicionar ao `pt-BR.json` o bloco `userMenu` (`label` "Menu do usuário", `edit` "Editar", `changePassword` "Trocar senha", `logout` "Sair") em `frontend/src/i18n/locales/pt-BR.json`
- [X] T003 Criar `UserMenu` com `UserMenuProps { onEdit; onChangePassword; onLogout }` usando `@radix-ui/react-dropdown-menu`: `Root` com `modal={false}`; `Trigger` é um `<button className="btn btn-sm btn-outline-secondary stm-user-trigger">` com `session?.user.name` (via `useAuth`), `aria-label={t('userMenu.label')}` e um caret; `Content` com `align="end"`, `sideOffset={4}`, `className="dropdown-menu show stm-user-menu"` dentro de `Portal`; itens `Item` com `className="dropdown-item"` na ordem Editar, Trocar senha, `Separator className="dropdown-divider"`, Sair; cada item chama o callback em `onSelect` (comentário citando research R1) — em `frontend/src/components/menu/UserMenu.tsx`
- [X] T004 [P] Estilizar o gatilho e o menu no tema escuro: `.stm-user-trigger` com `max-width: 220px`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`; `.stm-user-menu` com `position: static` (o posicionamento vem do Radix), `z-index` acima do mapa e abaixo do overlay do modal, `min-width: 180px`; `.dropdown-item[data-highlighted]` com o fundo de `--bs-dropdown-link-hover-bg` (Radix usa `data-highlighted` em vez de `:hover`/`:focus`) — em `frontend/src/styles/app.css` (a folha do app; não existe `index.css`)

**Checkpoint**: `UserMenu` renderiza isolado; nada ligado ao `TopMenu` ainda.

---

## Phase 3: User Story 1 - Abrir o submenu e sair (Priority: P1) 🎯 MVP

**Goal**: o nome no menu abre o submenu; "Sair" desloga com o aviso de alterações não salvas.

**Independent Test**: logar, clicar no nome, Esc fecha; "Sair" → tela de login + toast; com o mapa alterado, "Sair" mostra Salvar/Descartar/Cancelar e Cancelar mantém logado.

- [X] T005 [US1] No `TopMenu`, substituir o `<span>` do nome e o botão "Sair" por `<div className="ms-auto"><UserMenu onEdit={...} onChangePassword={...} onLogout={onLogout} /></div>`, mantendo `onLogout` (`await guard()` → `logout()` → `toast.info(t('toast.loggedOut'))`); adicionar os estados `editOpen`/`passwordOpen` (os callbacks só fazem `setEditOpen(true)`/`setPasswordOpen(true)` por enquanto); atualizar o comentário do componente — em `frontend/src/components/menu/TopMenu.tsx`
- [X] T006 [US1] Remover a chave `menu.logout` que ficou sem uso (buscar referências com grep antes) em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: US1 funcional e demonstrável (MVP).

---

## Phase 4: User Story 2 - Editar o usuário (Priority: P2)

**Goal**: modal que altera o nome e atualiza o menu e a sessão guardada.

**Independent Test**: "Editar" → e-mail desabilitado; nome vazio → toast e modal aberto; nome novo → modal fecha, toast, menu atualizado e mantido após F5.

- [X] T007 [P] [US2] Adicionar `export interface UserNameInfo { name: string; }` e `export interface UserPasswordInfo { currentPassword: string; newPassword: string; }` com comentário "mirror the backend User DTOs" em `frontend/src/types/auth.ts`
- [X] T008 [P] [US2] Criar `lib/userForms.ts` com `export const MAX_NAME_LENGTH = 260;`, `export const MIN_PASSWORD_LENGTH = 8;` (comentário: iguais a `Guard.RequiredText(…, 260)` e `UserService.MIN_PASSWORD_LENGTH` do backend), `export const validateName = (name: string): 'required' | 'tooLong' | null` (usa `trim`) e `export const validatePasswordChange = (form: { currentPassword: string; newPassword: string; confirmPassword: string }): 'required' | 'tooShort' | 'mismatch' | null` com a ordem campo vazio → nova < 8 → confirmação diferente — em `frontend/src/lib/userForms.ts`
- [X] T009 [P] [US2] Testes Vitest de `validateName` (vazio, só espaços, 260 ok, 261 `tooLong`, nome válido com espaços nas pontas) e `validatePasswordChange` (cada campo vazio → `required`, 7 caracteres → `tooShort`, 8 ok, confirmação diferente → `mismatch`, tudo válido → `null`, nova igual à atual aceita) em `frontend/src/lib/userForms.test.ts`
- [X] T010 [US2] Adicionar ao `AuthService` `async rename(data: UserNameInfo): Promise<UserInfo>` (`PUT ${API_BASE}/name`, `getHeaders(true)`) e `async changePassword(data: UserPasswordInfo): Promise<void>` (`PUT ${API_BASE}/password`, `getHeaders(true)`, 204), ambos via `this.handleResponse`; atualizar o comentário da classe para "login, account creation and profile" — em `frontend/src/Services/authService.ts`
- [X] T011 [US2] Adicionar ao `AuthContextType` e ao provider `updateName: (name: string) => Promise<UserInfo>` (chama `authService.rename({ name: name.trim() })`, depois `storeSession({ ...session, user })` lendo a sessão atual via `readStoredSession()` para não depender de closure antiga) e `changePassword: (data: UserPasswordInfo) => Promise<void>`, ambos com `setLoading`/`setError`/`handleError` no mesmo padrão de `login`, e incluí-los no `useMemo` — em `frontend/src/Contexts/AuthContext.tsx`
- [X] T012 [P] [US2] Adicionar ao `pt-BR.json` o bloco `profile` (`title` "Editar usuário", `name` "Nome", `email` "E-mail", `errors.required` "Informe o nome.", `errors.tooLong` "O nome deve ter no máximo 260 caracteres.") e `toast.profileSaved` "Nome atualizado." em `frontend/src/i18n/locales/pt-BR.json`
- [X] T013 [US2] Criar `EditUserModal` (`{ open, onOpenChange }`) sobre `components/ui/Modal`, no padrão do `GridSizeModal`: `useEffect` recarrega `name` de `session.user.name` ao abrir; `<form id="edit-user-form" noValidate>` com input `#profile-name` (`maxLength={MAX_NAME_LENGTH}`, `autoFocus`) e input `#profile-email` `disabled`; `onSubmit` → `validateName` (erro → `toast.error(t(\`profile.errors.${code}\`))` e retorna) → `await updateName(name)` → `toast.success(t('toast.profileSaved'))` e fecha; `catch` → `toast.error(err.message)` mantendo aberto; botão Salvar `disabled={loading}` — em `frontend/src/components/modals/EditUserModal.tsx`
- [X] T014 [US2] Renderizar `<EditUserModal open={editOpen} onOpenChange={setEditOpen} />` no `TopMenu` em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: US1 + US2 funcionando de forma independente.

---

## Phase 5: User Story 3 - Trocar a senha (Priority: P2)

**Goal**: modal de troca de senha com senha atual, nova e confirmação.

**Independent Test**: confirmação diferente/senha curta bloqueadas sem requisição; senha atual errada → toast, modal aberto; válido → toast, continua logado; login posterior só com a senha nova.

> Depende de T007, T008, T010 e T011 (tipos, validação, service e contexto), criados na US2. Se a US3 for feita antes, execute essas tarefas primeiro.

- [X] T015 [P] [US3] Adicionar ao `pt-BR.json` o bloco `password` (`title` "Trocar senha", `current` "Senha atual", `new` "Nova senha", `confirm` "Confirmar nova senha", `errors.required` "Preencha todos os campos.", `errors.tooShort` "A nova senha deve ter no mínimo {{min}} caracteres.", `errors.mismatch` "As senhas não conferem.") e `toast.passwordChanged` "Senha alterada." em `frontend/src/i18n/locales/pt-BR.json`
- [X] T016 [US3] Criar `ChangePasswordModal` (`{ open, onOpenChange }`) sobre `components/ui/Modal`: estados `currentPassword`/`newPassword`/`confirmPassword` zerados em `useEffect` ao abrir; `<form id="change-password-form" noValidate>` com três inputs `type="password"` (`#password-current` `autoComplete="current-password"` `autoFocus`, `#password-new` e `#password-confirm` `autoComplete="new-password"`); `onSubmit` → `validatePasswordChange` (erro → `toast.error(t(\`password.errors.${code}\`, { min: MIN_PASSWORD_LENGTH }))` sem requisição) → `await changePassword({ currentPassword, newPassword })` → limpa os campos, `toast.success(t('toast.passwordChanged'))`, fecha; `catch` → `toast.error(err.message)` mantendo aberto e os campos; Salvar `disabled={loading}` — em `frontend/src/components/modals/ChangePasswordModal.tsx`
- [X] T017 [US3] Renderizar `<ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />` no `TopMenu` em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: as três histórias funcionando.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 Rodar `npm run lint`, `npm test` e `npm run build` em `frontend/` e corrigir o que falhar
- [X] T019 Executar o roteiro de `specs/007-user-menu/quickstart.md` (API em Development + `npm run dev`), incluindo teclado no submenu, F5 após editar o nome e login com a senha antiga/nova
- [X] T020 [P] Atualizar a seção "Frontend layout and commands" do `CLAUDE.md` com uma linha sobre o `UserMenu` (Radix Dropdown + classes do Bootstrap, `modal={false}`, modais abertos pelo `TopMenu`, `updateName` regrava a sessão) em `CLAUDE.md`

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T004)** → histórias.
- **US1 (T005–T006)**: depende só da Foundational. MVP.
- **US2 (T007–T014)**: depende da Foundational e de T005 (estados no `TopMenu`).
- **US3 (T015–T017)**: depende de T005 e das bases criadas na US2 (T007, T008, T010, T011); independente da UI da US2 (`EditUserModal`).
- **Polish (T018–T020)**: após as histórias desejadas.
- Dentro das histórias: tipos/validação → service → contexto → modal → ligação no `TopMenu`.
- Arquivos compartilhados (sequenciais): `TopMenu.tsx` (T005 → T014 → T017) e `pt-BR.json` (T002 → T006 → T012 → T015).

## Parallel Example: User Story 2

```text
Task: "T007 Tipos UserNameInfo/UserPasswordInfo em src/types/auth.ts"
Task: "T008 Validações puras em src/lib/userForms.ts"
Task: "T009 Testes Vitest em src/lib/userForms.test.ts"
Task: "T012 Chaves profile.* em src/i18n/locales/pt-BR.json"
```

## Implementation Strategy

1. **MVP**: T001–T006 → submenu com "Sair" substituindo o botão atual; validar e demonstrar.
2. **Incremento 2**: T007–T014 → "Editar".
3. **Incremento 3**: T015–T017 → "Trocar senha".
4. **Fechamento**: T018–T020.
