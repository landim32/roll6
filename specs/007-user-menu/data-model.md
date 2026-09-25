# Data Model: Submenu do Usuário

Sem mudanças no banco nem nos DTOs do backend. Só tipos do frontend que espelham DTOs já existentes.

## Tipos (`frontend/src/types/auth.ts`)

| Tipo | Campos | Espelha |
|---|---|---|
| `UserInfo` (existente) | `userId`, `name`, `email` | `DTO/User/UserInfo` |
| `UserNameInfo` (novo) | `name: string` | `DTO/User/UserNameInfo` |
| `UserPasswordInfo` (novo) | `currentPassword: string`, `newPassword: string` | `DTO/User/UserPasswordInfo` |

`confirmPassword` existe só no estado do formulário (nunca é enviado).

## Estado de formulário

- **EditUserModal**: `name` (inicia com `session.user.name` a cada abertura); e-mail só exibido.
- **ChangePasswordModal**: `currentPassword`, `newPassword`, `confirmPassword` (iniciam vazios a cada
  abertura e são limpos após sucesso).

## Regras de validação (`lib/userForms.ts`)

| Regra | Resultado | Chave i18n |
|---|---|---|
| nome vazio após `trim` | `required` | `profile.errors.required` |
| nome > 260 caracteres | `tooLong` | `profile.errors.tooLong` |
| algum campo de senha vazio | `required` | `password.errors.required` |
| nova senha < 8 caracteres | `tooShort` | `password.errors.tooShort` |
| confirmação ≠ nova senha | `mismatch` | `password.errors.mismatch` |

## Sessão

`updateName` grava `{ ...session, user: userInfoRetornado }` em `roll6:auth` e no estado
do `AuthContext`; `token` e `expiresAt` não mudam. `changePassword` não altera a sessão.
