# Contracts: Submenu do Usuário

## API consumida (já existente, sem mudanças)

Ambas exigem `Authorization: Bearer {token}`.

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| PUT | `/api/user/name` | `{ "name": "Novo nome" }` | 200 `UserInfo` `{ userId, name, email }` | 400 nome vazio/> 260; 401 sessão expirada |
| PUT | `/api/user/password` | `{ "currentPassword": "...", "newPassword": "..." }` | 204 | 400 `currentPassword` incorreta ou `newPassword` < 8; 401 sessão expirada |

## Contrato de UI

### `UserMenu` (`components/menu/UserMenu.tsx`)

```ts
interface UserMenuProps {
  onEdit: () => void;           // abre EditUserModal
  onChangePassword: () => void; // abre ChangePasswordModal
  onLogout: () => void;         // guard() → logout() → toast
}
```

- Gatilho: botão com o nome do usuário (`session.user.name`), truncado com reticências, com
  `aria-haspopup="menu"`; ocupa o lugar do `<span>` do nome e do botão "Sair" atuais.
- Itens, nesta ordem: `userMenu.edit` "Editar", `userMenu.changePassword` "Trocar senha", divisor,
  `userMenu.logout` "Sair".

### `EditUserModal` (`components/modals/EditUserModal.tsx`)

`{ open: boolean; onOpenChange: (open: boolean) => void }`

- Título `profile.title` "Editar usuário"; campos: `profile.name` (input, `maxLength` 260),
  `profile.email` (input `readOnly`/`disabled`).
- Rodapé: "Cancelar" e "Salvar" (desabilitado durante `loading`).
- Sucesso → fecha, `toast.success(t('toast.profileSaved'))`; erro → mantém aberto, `toast.error(msg)`.

### `ChangePasswordModal` (`components/modals/ChangePasswordModal.tsx`)

`{ open: boolean; onOpenChange: (open: boolean) => void }`

- Título `password.title` "Trocar senha"; campos `type="password"`: `password.current`,
  `password.new`, `password.confirm` (com `autoComplete` `current-password`/`new-password`).
- Rodapé: "Cancelar" e "Salvar" (desabilitado durante `loading`).
- Validação local (R4) antes de enviar; sucesso → limpa, fecha,
  `toast.success(t('toast.passwordChanged'))`; erro do servidor → mantém aberto com os campos,
  `toast.error(msg)`.

### `AuthContext` (adições)

```ts
updateName: (name: string) => Promise<UserInfo>;
changePassword: (data: UserPasswordInfo) => Promise<void>;
```
