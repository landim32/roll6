# Research: Aba "Meus Tokens" e Edição de Tokens

## R1 — Filtro "só os meus"

- **Decision**: `GET /api/token?mine=true` → `TokenLibraryService.ListAsync(query, mine ? CurrentUserId : null)`
  → `ITokenRepository.ListPagedAsync(search, skip, take, ownerUserId)` filtrando `UserId`. `ListQuery.mine`
  já existe no frontend (`toQuery`).
- **Rationale**: mesmo padrão de `GET /api/mapmodel?mine=true`; o dono vem do JWT.
- **Alternatives**: endpoint `/api/token/mine` — duplicaria paginação/busca.

## R2 — Fechar o modal de tokens e abrir o de edição

- **Decision**: o `TokenModal` guarda um estado interno `editing: TokenInfo | null`. Com `editing`, ele
  passa `open={false}` ao próprio `Modal` e renderiza `<TokenEditModal open token={editing} …>`; ao
  salvar ou cancelar, limpa `editing`, reabre na aba `mine` e recarrega a lista. Os chamadores
  (`MainPage`, `CharacterFormModal`) não mudam e a ação pendente (`onSelect`) é preservada.
- **Rationale**: FR-005 sem espalhar estado pelos chamadores; o seletor do hex continua cinza porque o
  `tokenPick` do `MainPage` segue ativo.
- **Alternatives**: o chamador controlar os dois modais — três lugares repetindo a mesma lógica.

## R3 — Campos compartilhados

- **Decision**: extrair `components/tokens/TokenFormFields` (nome, descrição, imagem em pé, imagem
  deitado, espaços) usado pela aba "Incluir token" e pelo `TokenEditModal`. Na edição, cada
  `ImageCropper` recebe `hasCurrent`/`currentUrl` e, para a imagem deitado, `onRemoveCurrent`.
  `lib/tokenForm.toTokenForm(token)` preenche o formulário.
- **Rationale**: FR-006 (mesmas regras); nenhuma divergência entre cadastro e edição.

## R4 — Imagem atual na edição

- **Decision**: salvar envia `upImage` = novo arquivo recortado (240 × 240) ou o nome atual; `downImage`
  = novo, atual ou `null` se removida. A imagem em pé não tem "remover" (mantém ou troca).
- **Rationale**: FR-006; a imagem em pé é a que aparece no mapa.

## R5 — Grade e lápis

- **Decision**: `components/tokens/TokenGrid` (itens, `onPick`, `onEdit?`, paginação) com
  `row row-cols-4 g-2`; o lápis é um `<button>` irmão do botão do card, posicionado em absoluto no
  canto superior direito da imagem (`.stm-token-edit`, círculo translúcido com desfoque), com
  `aria-label="Editar {nome}"`. Por ser irmão (não filho), clicar nele não escolhe o token.
- **Rationale**: FR-003/FR-004; botões aninhados são HTML inválido.

## R6 — Estado das abas

- **Decision**: cada aba de lista ("Meus Tokens" e "Buscar tokens") tem sua busca (debounce 300 ms),
  página e resultado; carregam só quando a aba está ativa e são recarregadas ao voltar da edição.
- **Rationale**: edge case "cada aba tem sua própria busca e página".
