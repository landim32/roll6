# Feature Specification: Aba "Meus Tokens" e Edição de Tokens

**Feature Branch**: `012-my-tokens-tab`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "Na tela dos tokens, adicione uma aba chamada \"Meus Tokens\", deve ser a primeira: altere a lista de token para exibir 4 colunas ao invés de 3; nos meus tokens, deve ter um botão de editar, flutuando na parte superior direita da imagem; ao clicar deve fechar esse modal e abrir o modal para editar o token; o usuário só pode editar seus tokens."

> Contexto: o **modal de tokens** (feature 011) é aberto pelo menu do hex ("Incluir token" / "Alterar
> token"), ao colocar no mapa um personagem sem token e ao escolher o token no cadastro do personagem.
> Hoje ele tem as abas "Buscar tokens" (biblioteca de todos os usuários) e "Incluir token".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Achar rápido os próprios tokens (Priority: P1)

Ao abrir o modal de tokens, a primeira aba é **"Meus Tokens"**, com só os tokens que o usuário
cadastrou. Ele escolhe um deles como já faz na busca. A grade das listas passa a ter 4 colunas, para
caber mais tokens de uma vez.

**Why this priority**: na mesa o usuário quase sempre usa as próprias peças; hoje elas ficam
misturadas com as de todo mundo.

**Independent Test**: com tokens próprios e de outros usuários cadastrados, abrir o modal e ver a aba
"Meus Tokens" selecionada, só com os próprios tokens, em 4 colunas; escolher um e ver a ação concluída.

**Acceptance Scenarios**:

1. **Given** o modal de tokens aberto por qualquer caminho, **When** ele aparece, **Then** as abas são,
   nesta ordem, "Meus Tokens", "Buscar tokens" e "Incluir token", com "Meus Tokens" selecionada.
2. **Given** o usuário tem tokens cadastrados, **When** a aba "Meus Tokens" é exibida, **Then** aparecem
   só os tokens criados por ele, numa grade de 4 colunas, com imagem (ou inicial) e nome.
3. **Given** a aba "Meus Tokens", **When** o usuário digita na busca, **Then** a lista mostra só os
   próprios tokens cujo nome contém o texto; havendo muitos, a lista é paginada.
4. **Given** a aba "Meus Tokens", **When** o usuário clica num token (fora do botão de editar), **Then**
   ele é escolhido e a ação que abriu o modal é concluída, igual à aba de busca.
5. **Given** o usuário não tem tokens, **When** a aba "Meus Tokens" é exibida, **Then** aparece uma
   mensagem sugerindo a aba "Incluir token" (ou a busca na biblioteca).
6. **Given** a aba "Buscar tokens", **When** é exibida, **Then** a grade também tem 4 colunas.

---

### User Story 2 - Editar um token próprio (Priority: P1)

Na aba "Meus Tokens", cada token tem um botão de editar flutuando no canto superior direito da imagem.
Ao clicar, o modal de tokens fecha e abre o modal de edição do token, com nome, descrição, imagens e
espaços preenchidos. Ao salvar, as mudanças valem para todas as peças que usam esse token.

**Why this priority**: sem editar, um erro de nome ou de imagem obriga a cadastrar outro token.

**Independent Test**: na aba "Meus Tokens", clicar no lápis de um token, trocar o nome e a imagem em pé,
salvar e ver o novo nome e imagem na lista e nas peças do mapa que usam o token.

**Acceptance Scenarios**:

1. **Given** a aba "Meus Tokens", **When** o usuário passa o mouse ou olha um token, **Then** vê um
   botão de editar (lápis) no canto superior direito da imagem, sem cobrir o nome.
2. **Given** o botão de editar, **When** clicado, **Then** o token **não** é escolhido, o modal de tokens
   fecha e abre o modal "Editar token" com os dados atuais (nome, descrição, imagem em pé, imagem
   deitado, espaço em pé e deitado).
3. **Given** o modal de edição, **When** o usuário troca a imagem, **Then** o recorte segue as regras do
   cadastro (quadrado, com zoom e rotação, salvo em 240 × 240 px); sem trocar, a imagem atual é mantida.
4. **Given** o modal de edição, **When** o usuário remove a imagem deitado e salva, **Then** o token fica
   sem imagem deitado.
5. **Given** o modal de edição com dados válidos, **When** salva, **Then** um toast confirma e as peças
   do mapa aberto que usam o token passam a mostrar o novo nome/imagem na próxima atualização do mapa.
6. **Given** o modal de edição, **When** o nome fica vazio (ou outra regra do cadastro é violada),
   **Then** um toast informa o erro e nada é salvo.
7. **Given** o modal de edição, **When** o usuário salva ou cancela, **Then** volta ao modal de tokens na
   aba "Meus Tokens", para continuar a ação que tinha aberto o modal.

---

### User Story 3 - Só o dono edita (Priority: P1)

Somente o criador de um token pode alterá-lo. Tokens de outros usuários não mostram o botão de editar e
o sistema recusa qualquer tentativa de alteração por outra pessoa.

**Why this priority**: a biblioteca é compartilhada; alterar o token de alguém mudaria as peças dos
mapas dele.

**Independent Test**: na aba "Buscar tokens", confirmar que tokens de outros usuários não têm botão de
editar; tentar alterar um token alheio por qualquer meio e ver a recusa.

**Acceptance Scenarios**:

1. **Given** a aba "Buscar tokens", **When** exibida, **Then** nenhum token tem botão de editar (a
   edição fica na aba "Meus Tokens").
2. **Given** um token de outro usuário, **When** alguém tenta alterá-lo por qualquer meio, **Then** o
   sistema recusa informando que só o dono pode alterar.

---

### Edge Cases

- Token usado em mapas de outras campanhas ou como token de personagens: a edição vale para todos esses
  usos (é o mesmo token).
- Nome do token alterado: peças NPC já colocadas mantêm o nome que receberam ao serem colocadas; só a
  imagem muda. Peças de personagem continuam com o nome do personagem.
- Edição cancelada: nada muda e o usuário volta ao modal de tokens.
- Busca digitada em "Meus Tokens" e troca para "Buscar tokens": cada aba tem sua própria busca e página.
- Token editado enquanto está na lista: ao voltar, a lista mostra os dados novos.
- Muitos tokens próprios: paginação com a mesma quantidade por página da aba de busca.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O modal de tokens MUST ter as abas "Meus Tokens" (primeira e selecionada ao abrir),
  "Buscar tokens" e "Incluir token".
- **FR-002**: "Meus Tokens" MUST listar só os tokens criados pelo usuário, com busca por nome e
  paginação; clicar num token MUST escolhê-lo como na busca.
- **FR-003**: As grades de "Meus Tokens" e "Buscar tokens" MUST ter 4 colunas.
- **FR-004**: Cada token em "Meus Tokens" MUST ter um botão de editar flutuando no canto superior
  direito da imagem; clicar nele MUST NOT escolher o token.
- **FR-005**: Clicar em editar MUST fechar o modal de tokens e abrir o modal "Editar token" com os dados
  atuais; salvar ou cancelar MUST reabrir o modal de tokens em "Meus Tokens", mantendo a ação pendente.
- **FR-006**: A edição MUST seguir as mesmas regras e limites do cadastro (nome obrigatório ≤ 260,
  descrição ≤ 2.000, espaços inteiros ≥ 0, imagens quadradas 240 × 240 com zoom e rotação), permitindo
  manter, trocar ou remover cada imagem (a imagem em pé pode ser trocada; a deitado pode ser removida).
- **FR-007**: Só o criador do token MUST poder alterá-lo; tentativas de outros usuários MUST ser
  recusadas com mensagem de falta de permissão.
- **FR-008**: Tokens de outros usuários MUST NOT exibir o botão de editar.
- **FR-009**: Sucesso e erro MUST ser comunicados por toast; textos em pt-BR.

### Key Entities

- **Token** (existente): nome, descrição, imagens em pé/deitado, espaços, **criador**. Sem campos novos;
  a listagem passa a poder filtrar pelos tokens do usuário.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário escolhe um token próprio em no máximo 1 clique depois de abrir o modal (sem
  trocar de aba nem buscar).
- **SC-002**: A grade mostra 4 tokens por linha (33% mais tokens visíveis que hoje por linha).
- **SC-003**: Corrigir o nome ou a imagem de um token próprio leva no máximo 4 passos (editar →
  alterar → salvar → voltar à lista).
- **SC-004**: 100% das tentativas de alterar token de outro usuário são recusadas.

## Assumptions

- A edição de tokens já é permitida só ao criador no sistema; esta feature acrescenta o filtro "só os
  meus" na listagem e as telas.
- O modal "Editar token" usa os mesmos campos e o mesmo recorte de imagem da aba "Incluir token".
- Depois de salvar ou cancelar a edição, o usuário volta ao modal de tokens para concluir a ação que o
  abriu (incluir, alterar, colocar personagem ou escolher o token do personagem).
- Excluir tokens da biblioteca continua fora do escopo.
- Peças NPC guardam o nome recebido ao serem colocadas; renomear o token não as renomeia.
