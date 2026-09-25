# Research: Submenu do Usuário

## R1. Componente do submenu

- **Decision**: `@radix-ui/react-dropdown-menu`, estilizado com as classes `dropdown-menu`,
  `dropdown-item` e `dropdown-divider` do Bootstrap (tema escuro), alinhado à direita do gatilho.
- **Rationale**: cobre FR-002 sem código próprio (fecha ao escolher, clique fora e Esc; navegação por
  setas/Enter; foco devolvido ao gatilho; atributos ARIA). É da mesma família do Radix Dialog já
  usado nos modais, então o comportamento de foco entre menu → modal é consistente.
- **Alternatives considered**: dropdown do Bootstrap JS (exige carregar `bootstrap.bundle` + Popper e
  manipulação imperativa fora do React; o app só importa o CSS); menu feito à mão (reimplementar
  teclado, clique fora e ARIA).
- **Nota**: abrir um modal a partir de um item do menu deve acontecer após o menu fechar (o item chama
  `onSelect` → estado do modal no `TopMenu`), para o Radix não devolver o foco ao gatilho por cima do
  modal. Usar `modal={false}` no `DropdownMenu.Root` evita o bloqueio de ponteiro do menu competindo
  com o overlay do Dialog.

## R2. Onde ficam as chamadas de API

- **Decision**: estender o `AuthService` (`/api/user`) com `rename(data)` → `PUT /api/user/name`
  (retorna `UserInfo`) e `changePassword(data)` → `PUT /api/user/password` (204). O `AuthContext`
  expõe `updateName(name)` e `changePassword(data)`.
- **Rationale**: o service já é o dono de `/api/user` e da sessão; `updateName` precisa regravar a
  sessão (`storeSession({ ...session, user })`), o que só o `AuthContext` faz. Mantém o padrão
  `try/finally` com `loading` e `handleError`.
- **Alternatives considered**: `UserService`/`UserContext` separados — duplicaria o estado do usuário
  que já vive na sessão e obrigaria sincronizar os dois.

## R3. Erros e sessão

- **Decision**: senha atual errada chega como 400 (`ValidationProblemDetails`, campo
  `currentPassword`, "A senha atual está incorreta."); `readError` já extrai a primeira mensagem, que
  vira o toast. 401 continua levando ao logout global (sessão expirada). A troca de senha não mexe no
  token: o JWT atual segue válido até expirar (spec: usuário continua logado).
- **Rationale**: reaproveita `handleApiResponse`, que já trata 204 e 401.

## R4. Validação no cliente

- **Decision**: funções puras em `lib/userForms.ts`:
  - `validateName(name)` → `'required' | 'tooLong' | null` (trim; máx. 260, igual ao `Guard.RequiredText`
    do backend); o input também usa `maxLength={260}`.
  - `validatePasswordChange({ currentPassword, newPassword, confirmPassword })` →
    `'required' | 'tooShort' | 'mismatch' | null`, na ordem: campo vazio, nova < 8
    (`MIN_PASSWORD_LENGTH` do backend), confirmação diferente.
  O código de erro vira chave i18n (`password.errors.tooShort` etc.).
- **Rationale**: testável em Vitest sem DOM (o projeto só testa `lib/`); o backend continua sendo a
  fonte da verdade e valida de novo.
- **Alternatives considered**: validação HTML nativa (`required`/`minLength`) — o app usa `noValidate`
  porque os balões nativos escondem os toasts (lição da feature 006).

## R5. "Sair" com mapa não salvo

- **Decision**: o item "Sair" chama o mesmo `onLogout` de hoje (`await guard()` → `logout()` →
  `toast.info(t('toast.loggedOut'))`); a navegação para `/login` já acontece pelo `ProtectedRoute`
  quando `isAuthenticated` vira `false`.
- **Rationale**: FR-004 pede o mesmo aviso já existente; nada novo a construir.
