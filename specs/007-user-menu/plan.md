# Implementation Plan: Submenu do Usuário (Editar, Trocar senha, Sair)

**Branch**: `007-user-menu` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-user-menu/spec.md`

## Summary

O nome do usuário no `TopMenu` vira o gatilho de um submenu (Radix Dropdown Menu com as classes
`dropdown-menu`/`dropdown-item` do Bootstrap) com "Editar", "Trocar senha" e "Sair". "Editar" e
"Trocar senha" abrem modais novos sobre o `Modal` base; "Sair" reaproveita o `guard()` de alterações
não salvas e o `logout()` existentes. Os endpoints já existem (`PUT /api/user/name`,
`PUT /api/user/password`): o `AuthService` ganha `rename` e `changePassword`, e o `AuthContext` ganha
`updateName` (regrava a sessão no localStorage mantendo o token) e `changePassword`. A validação do
formulário de senha é uma função pura testada com Vitest. **Sem mudanças no backend.**

## Technical Context

**Language/Version**: TypeScript 5 + React 18 (frontend apenas)
**Primary Dependencies**: Vite 6, Bootstrap 5.3 (tema escuro), i18next, sonner, `@radix-ui/react-dialog`
(já no projeto) + `@radix-ui/react-dropdown-menu` (novo, research R1)
**Storage**: sessão em localStorage `roll6:auth` (já existente); nada novo no banco
**Testing**: Vitest (`lib/`), `tsc`, lint, verificação manual/Playwright pelo quickstart
**Target Platform**: navegadores desktop atuais
**Project Type**: web app (SPA em `frontend/` + API .NET existente em `backend/`)
**Performance Goals**: nome atualizado no menu imediatamente após a resposta (SC-002 < 1 s)
**Constraints**: textos só via i18next pt-BR; feedback só por toast; modais sobre `components/ui/Modal`
**Scale/Scope**: 1 componente de menu, 2 modais, 2 métodos de service, 2 ações de contexto, 1 helper puro

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Não há entidade nova: estende o `AuthService`/`AuthContext`/`useAuth` já criados pela `react-architecture`, no mesmo padrão (`handleError`, `loading`, `clearError`) | ✅ |
| II | Stack fixa | React/TS/Vite/Bootstrap/i18next/Fetch/Context API; `@radix-ui/react-dropdown-menu` é da mesma família do Radix Dialog já adotado (skill `react-modal`), sem state management novo | ✅ |
| III | Casing de diretórios | Arquivos em `src/Services/`, `src/Contexts/`, `src/hooks/`, `src/types/` existentes | ✅ |
| IV | Convenções de código | `interface`, arrow functions, `const`, sem `enum` (`erasableSyntaxOnly`) | ✅ |
| V | Banco | Sem mudança de esquema | ➖ N/A |
| VI | Autenticação e segurança | Token segue só no localStorage; senhas não são guardadas nem logadas; rotas já exigem `[Authorize]` | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |
| — | Respostas / erros | `rename` lê `UserInfo` direto; `changePassword` trata 204; erros vêm de `ProblemDetails` | ✅ |

Re-check pós-design: sem violações; nenhuma entrada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-user-menu/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/
├── package.json                         # + @radix-ui/react-dropdown-menu
└── src/
    ├── types/auth.ts                    # + UserNameInfo, UserPasswordInfo
    ├── Services/authService.ts          # + rename(), changePassword()
    ├── Contexts/AuthContext.tsx         # + updateName(), changePassword()
    ├── lib/
    │   ├── userForms.ts                 # validateName(), validatePasswordChange() (puras)
    │   └── userForms.test.ts
    ├── components/
    │   ├── menu/
    │   │   ├── TopMenu.tsx              # nome → UserMenu; remove o botão "Sair" solto
    │   │   └── UserMenu.tsx             # submenu Editar / Trocar senha / Sair
    │   └── modals/
    │       ├── EditUserModal.tsx
    │       └── ChangePasswordModal.tsx
    ├── i18n/locales/pt-BR.json          # + chaves userMenu.*, profile.*, password.*, toast.*
    └── styles/app.css                   # estilo do gatilho/menu (tema escuro)
```

**Structure Decision**: somente `frontend/`. O backend (`UserController` `PUT name`/`PUT password`)
já atende ao contrato; ver [contracts/ui.md](./contracts/ui.md).

## Complexity Tracking

Nenhuma violação a justificar.
