# Feature Specification: Tokens no Mapa

**Feature Branch**: `011-map-tokens-placement`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "No Backend: o Character deve ter um Token, não é um campo obrigatório; o MapToken deve ter um campo de relacionamento com CampaignCharacter quando for do tipo Character. No Frontend: deve colocar um azul claro em cima do hex que o usuário passar o mouse; quando o usuário arrastar um personagem para um hex, deve colocar o token daquele personagem; se o personagem não tem um token, deve abrir o modal de tokens; quando o usuário clicar em um hex vazio, deve exibir um menu "Incluir token", ao clicar deve abrir o Modal de tokens; quando clicar em um hex que tem um token, deve exibir um menu "Alterar token", ao clicar deve abrir o Modal de tokens; Modal de tokens com 2 abas: Buscar tokens (lista em 3 colunas) e Incluir token (cadastro do token)."

## Clarifications

### Session 2026-09-25

- Q: Quem pode colocar e alterar tokens no mapa? → A: só o mestre da campanha (regra atual); os
  jogadores veem os tokens e o destaque do hex, sem arraste nem menu.
- Q: O token escolhido para um personagem sem token vira o token do personagem? → A: sim — quando o
  personagem não tem token, o escolhido é gravado como token do personagem, mesmo que quem arrastou
  (o mestre) não seja o dono. Se o personagem já tem token, ele é colocado direto, sem abrir o modal.

> **Terminologia**: **token** é a peça da biblioteca (nome, descrição, imagens em pé/deitado);
> **token do mapa** é uma peça colocada num hex de um mapa da campanha, feita a partir de um token.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os tokens e o hex sob o mouse (Priority: P1)

Ao abrir um mapa da campanha, todos os tokens do mapa aparecem nos seus hexes, com a imagem do token.
Ao passar o mouse sobre o mapa, o hex sob o cursor fica destacado em azul claro, para o usuário saber
exatamente onde vai clicar ou soltar.

**Why this priority**: sem enxergar os tokens e o hex alvo nenhuma das outras ações faz sentido.

**Independent Test**: abrir um mapa que já tem tokens gravados e vê-los nos hexes certos; mover o
mouse e ver o destaque acompanhar o hex sob o cursor.

**Acceptance Scenarios**:

1. **Given** um mapa da campanha com tokens, **When** o mestre ou um participante aprovado o abre,
   **Then** cada token aparece centralizado no seu hex, com a imagem do token (ou a inicial do nome
   quando não há imagem).
2. **Given** o mouse sobre o mapa, **When** ele passa por um hex, **Then** esse hex fica preenchido
   em azul claro translúcido (a imagem e o token continuam visíveis) e o destaque some ao sair da grid.
3. **Given** o mouse fora da grid ou sobre os controles do mapa, **When** ele se move, **Then** nenhum
   hex fica destacado.
4. **Given** um token do tipo personagem, **When** ele é exibido, **Then** o nome mostrado é o do
   personagem.
5. **Given** o mapa com zoom ou deslocado, **When** o mouse passa sobre um hex, **Then** o destaque
   continua exatamente sobre o hex sob o cursor.

---

### User Story 2 - Arrastar um personagem para o mapa (Priority: P1)

O usuário arrasta o card de um personagem do painel da campanha e solta sobre um hex. O token daquele
personagem é colocado no hex, ligado à participação do personagem na campanha. Se o personagem ainda
não tem token, abre o modal de tokens para escolher ou cadastrar um.

**Why this priority**: colocar os personagens da mesa no mapa é o uso principal da feature.

**Independent Test**: com um personagem que tem token, arrastar o card para um hex vazio e ver o token
aparecer ali; recarregar e confirmar que continua lá; arrastar um personagem sem token e ver o modal
abrir.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado com token, **When** o usuário arrasta o card dele e solta num hex
   vazio, **Then** o token do personagem aparece nesse hex e fica gravado no mapa.
2. **Given** o personagem já tem um token neste mapa, **When** o usuário o arrasta de novo para outro
   hex, **Then** o token existente é movido para o novo hex (o personagem não fica duplicado no mapa).
3. **Given** um personagem sem token, **When** o mestre o solta num hex, **Then** abre o modal de
   tokens; ao escolher (ou cadastrar) um token, ele é gravado como token do personagem (mesmo que o
   mestre não seja o dono) e colocado no hex.
4. **Given** um personagem que já tem token, **When** o mestre o solta num hex, **Then** o token dele é
   colocado direto, sem abrir o modal.
5. **Given** o modal aberto a partir de um personagem sem token, **When** o usuário cancela, **Then**
   nada é colocado no mapa e o personagem continua sem token.
6. **Given** o usuário solta o card fora da grid ou num hex ocupado por outro token, **When** solta,
   **Then** nada muda e um aviso informa que o hex precisa estar livre.
7. **Given** um jogador (não mestre), **When** olha o painel e o mapa, **Then** os cards não são
   arrastáveis e clicar num hex não abre menu.

---

### User Story 3 - Menu do hex: incluir ou alterar token (Priority: P2)

Clicando num hex vazio aparece um pequeno menu com "Incluir token"; clicando num hex com token aparece
"Alterar token". Os dois abrem o modal de tokens; a escolha inclui um novo token do mapa no hex ou
troca o token do token do mapa existente.

**Why this priority**: permite colocar NPCs, inimigos e objetos, que não vêm do painel de personagens.

**Independent Test**: clicar num hex vazio → "Incluir token" → escolher um token → ele aparece no hex;
clicar nele → "Alterar token" → escolher outro → a imagem muda e o token continua no mesmo hex.

**Acceptance Scenarios**:

1. **Given** um hex vazio, **When** o usuário clica nele, **Then** aparece um menu junto ao hex com a
   opção "Incluir token".
2. **Given** um hex com token, **When** o usuário clica nele, **Then** aparece o menu com a opção
   "Alterar token".
3. **Given** o menu aberto, **When** o usuário clica fora, pressiona Esc ou arrasta o mapa, **Then** o
   menu fecha sem alterar nada.
4. **Given** "Incluir token" escolhido e um token selecionado no modal, **When** confirma, **Then** um
   novo token do mapa é criado no hex, com o nome do token.
5. **Given** "Alterar token" num token do mapa, **When** outro token é escolhido, **Then** a peça no hex
   passa a usar o novo token, mantendo posição, direção e (se for personagem) a ligação com o
   personagem.
6. **Given** um arraste do mapa (pan), **When** o botão é solto, **Then** isso não conta como clique e
   o menu não abre.

---

### User Story 4 - Modal de tokens: buscar e cadastrar (Priority: P2)

O modal de tokens tem duas abas: **Buscar tokens**, com a lista de tokens em 3 colunas (imagem e nome)
e busca por nome; e **Incluir token**, com o cadastro de um token novo (nome, descrição, imagem em pé,
imagem deitado opcional, espaço em pé/deitado). Escolher um token na lista ou salvar um novo conclui a
ação que abriu o modal.

**Why this priority**: é o ponto de entrada comum das US2 e US3.

**Independent Test**: abrir o modal, buscar "gob", ver os resultados em 3 colunas, escolher um; na aba
"Incluir token", cadastrar um token com imagem e vê-lo usado imediatamente.

**Acceptance Scenarios**:

1. **Given** o modal aberto, **When** a aba "Buscar tokens" é exibida, **Then** os tokens aparecem numa
   grade de 3 colunas com imagem (ou inicial) e nome, paginados.
2. **Given** um texto na busca, **When** o usuário digita, **Then** a lista mostra só os tokens cujo
   nome contém o texto.
3. **Given** a aba "Incluir token", **When** o usuário preenche o nome, envia a imagem em pé e salva,
   **Then** o token é cadastrado, um toast confirma e ele é usado na ação que abriu o modal.
4. **Given** o cadastro sem nome, **When** tenta salvar, **Then** um toast informa o erro e nada é
   salvo.
5. **Given** nenhum token cadastrado, **When** a aba de busca é exibida, **Then** aparece uma mensagem
   de lista vazia sugerindo a aba "Incluir token".

---

### User Story 5 - Token do personagem (Priority: P3)

O dono do personagem pode escolher um token para ele no cadastro do personagem (opcional). É esse token
que é usado quando o personagem é arrastado para o mapa.

**Why this priority**: melhora o fluxo da US2, mas a US2 já funciona escolhendo o token no modal.

**Independent Test**: no cadastro do personagem, escolher um token pelo modal de tokens, salvar,
arrastar o personagem para o mapa e ver aquele token.

**Acceptance Scenarios**:

1. **Given** o dono no modal do personagem, **When** clica em "Escolher token", **Then** abre o modal de
   tokens; o escolhido aparece como token do personagem até salvar.
2. **Given** um personagem com token, **When** o dono remove o token e salva, **Then** o personagem fica
   sem token.
3. **Given** um token usado como token de algum personagem, **When** o dono do token tenta excluí-lo,
   **Then** a exclusão é recusada informando que o token está em uso.

---

### Edge Cases

- Mapa sem campanha (modelo aberto fora de uma campanha): não há tokens do mapa; o destaque do hex
  continua funcionando, mas o menu e o arraste não aparecem.
- Personagem removido da campanha: os tokens do mapa ligados a ele deixam de aparecer e não bloqueiam
  a remoção.
- Token da biblioteca excluído enquanto está em uso num mapa: a exclusão continua bloqueada (regra
  atual).
- Dois usuários (mestre e jogador) mexendo ao mesmo tempo: vale o último salvamento; o mapa atualiza
  na próxima recarga dos tokens.
- Token maior que um hex (espaço em pé > 1): nesta feature ocupa visualmente só o hex de origem.
- Clique num hex durante o ajuste da imagem do mapa (modo de redimensionar): o menu não abre.
- Mapa com alterações não salvas no modelo: colocar tokens não depende de salvar o modelo.

## Requirements *(mandatory)*

### Functional Requirements

**Dados**

- **FR-001**: O personagem MUST poder ter um token da biblioteca (opcional). O dono o define e troca no
  cadastro do personagem; o mestre da campanha só o define quando o personagem ainda não tem token, ao
  colocá-lo no mapa (FR-015) — única exceção à regra da feature 010 de o mestre não alterar o
  personagem.
- **FR-002**: O token do mapa do tipo personagem MUST ficar ligado à participação do personagem na
  campanha do mapa; outros tipos MUST NOT ter essa ligação.
- **FR-003**: Um token do mapa ligado a uma participação MUST exibir o nome, a vida, a energia e o
  status da participação (não cópias próprias).
- **FR-004**: Cada participação MUST ter no máximo um token do mapa por mapa.
- **FR-005**: A participação ligada MUST pertencer à mesma campanha do mapa e estar aprovada.
- **FR-006**: Um token usado como token de personagem MUST NOT poder ser excluído da biblioteca.

**Mapa**

- **FR-007**: O mapa da campanha MUST exibir os tokens do mapa nas suas posições, com a imagem do
  token (em pé).
- **FR-008**: O hex sob o mouse MUST ser destacado em azul claro translúcido, respeitando zoom e
  deslocamento.
- **FR-009**: Soltar o card de um personagem num hex livre MUST colocar (ou mover, se já existir neste
  mapa) o token daquele personagem; sem token, MUST abrir o modal de tokens.
- **FR-010**: Clicar num hex MUST abrir um menu com "Incluir token" (hex vazio) ou "Alterar token" (hex
  ocupado); arrastar o mapa MUST NOT abrir o menu.
- **FR-011**: "Incluir token" MUST criar um token do mapa no hex com o token escolhido; "Alterar token"
  MUST trocar o token da peça mantendo posição, direção e ligação com o personagem.
- **FR-012**: Colocar, mover e alterar tokens do mapa MUST ser permitido só ao mestre da campanha;
  os demais participantes MUST ver os tokens e o destaque do hex, sem menu nem arraste.

**Modal de tokens**

- **FR-013**: O modal MUST ter as abas "Buscar tokens" (grade de 3 colunas, busca por nome, paginação)
  e "Incluir token" (nome, descrição, imagem em pé, imagem deitado opcional, espaços em pé/deitado).
- **FR-014**: Escolher um token ou salvar um novo MUST concluir a ação que abriu o modal (incluir,
  alterar, colocar personagem ou escolher o token do personagem).
- **FR-015**: Ao soltar um personagem que já tem token, ele MUST ser colocado direto, sem modal. Sem
  token, o modal MUST abrir e o token escolhido MUST ser gravado como token do personagem (mesmo pelo
  mestre não dono) e usado no token do mapa; cancelar MUST NOT alterar nada.
- **FR-016**: Sucesso e erro MUST ser comunicados por toast; todos os textos em pt-BR.

### Key Entities

- **Token** (biblioteca, existente): nome, descrição, imagens em pé/deitado, espaços.
- **Personagem**: ganha o **token** opcional (referência a um token da biblioteca).
- **Token do mapa** (existente): mapa, token, tipo (personagem, NPC, inimigo, objeto), posição
  (coluna/linha), direção; ganha a **participação** opcional, obrigatória e única por mapa quando o
  tipo é personagem.
- **Participação na campanha** (existente): fonte do nome, vida, energia e status exibidos no token do
  mapa do personagem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Colocar um personagem com token no mapa leva 1 gesto (arrastar e soltar), sem abrir
  janelas.
- **SC-002**: Incluir um NPC a partir da biblioteca leva no máximo 3 cliques (hex → "Incluir token" →
  token).
- **SC-003**: O destaque do hex acompanha o mouse sem atraso perceptível e está sempre sobre o hex
  correto, em qualquer zoom.
- **SC-004**: Um personagem nunca aparece duas vezes no mesmo mapa (0 duplicatas em 100% dos testes).
- **SC-005**: Tokens colocados continuam nos mesmos hexes após recarregar a página (100%).

## Assumptions

- Tokens do mapa só existem em **mapas de campanha** (um modelo aberto fora de campanha não tem
  tokens), como hoje no backend.
- Tokens incluídos pelo menu "Incluir token" são criados como **NPC**; trocar o tipo, editar nome/vida
  /ficha de tokens que não são de personagem, mover tokens arrastando no mapa, girar (direção) e remover
  tokens do mapa ficam fora do escopo desta feature.
- O arraste parte do card do personagem no painel da campanha (feature 009).
- A lista "Buscar tokens" mostra a biblioteca inteira (todos os usuários), como a consulta atual; o
  cadastro usa o envio de imagem já existente.
- Os tokens do mapa são recarregados ao abrir o mapa e depois de cada ação do próprio usuário; não há
  atualização em tempo real nesta feature.
- Tokens do mapa de personagem deixam de usar as cópias próprias de nome/vida/energia/status/ficha e
  passam a ler da participação; os demais tipos continuam com as cópias.
