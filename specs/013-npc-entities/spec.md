# Feature Specification: NPCs (biblioteca, campanha e mapa)

**Feature Branch**: `013-npc-entities`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Crie no backend: Entidade Npc (UserId, TokenId obrigatório, Name, Life, Energy, Move, Sheet, Image?, CreatedAt, UpdatedAt; CRUD, só pode ser alterado ou excluído pelo dono); Entidade CampaignNpc (CampaignId, NpcId; CRUD, só pode ser incluído ou excluído pelo dono da campanha); Entidade MapNpc (MapId, NpcId, Name, Life, Energy, Status; CRUD, só pode ser incluído ou excluído pelo dono da campanha)."

> **Escopo**: somente backend (dados, regras e operações). Telas ficam para uma feature seguinte.
>
> **Terminologia**: **NPC** é um personagem do mestre (ficha e token próprios), guardado na biblioteca
> de quem o criou. **NPC da campanha** é um NPC disponível numa campanha. **NPC do mapa** é uma
> ocorrência desse NPC num mapa da campanha, com nome, vida, energia e status próprios (ex.: três
> "Goblin" no mesmo mapa, cada um com sua vida).

## Clarifications

### Session 2026-09-26

- Q: A posição do NPC no mapa fica no próprio NPC do mapa ou numa peça do mapa? → A: o NPC do mapa se
  liga a uma peça do mapa (token do mapa), como os personagens: a peça guarda a posição (coluna/linha) e
  a direção, e passa a exibir nome, vida, energia e status do NPC do mapa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar NPCs (Priority: P1)

Um usuário cadastra NPCs na sua biblioteca: nome, vida, energia, movimento, ficha, imagem opcional e um
token obrigatório (a peça usada no mapa). Ele lista, consulta, altera e exclui os próprios NPCs.

**Why this priority**: sem NPCs cadastrados não há o que levar para a campanha nem para o mapa.

**Independent Test**: criar um NPC com token, listá-lo, alterar a vida, tentar alterá-lo com outro
usuário (recusado) e excluí-lo.

**Acceptance Scenarios**:

1. **Given** um usuário logado e um token existente, **When** cadastra um NPC com nome e token, **Then**
   o NPC é criado como dele, com vida, energia e movimento informados (0 quando omitidos).
2. **Given** um cadastro sem token, ou com token inexistente, **When** enviado, **Then** é recusado
   informando que o token é obrigatório/não existe.
3. **Given** nome vazio, nome acima de 260 caracteres, ficha acima de 20.000 caracteres, valores
   negativos ou imagem inválida, **When** enviado, **Then** é recusado com a regra violada.
4. **Given** um usuário, **When** lista os NPCs, **Then** vê só os próprios, com busca por nome e
   paginação.
5. **Given** o NPC de outro usuário, **When** alguém tenta consultar, alterar ou excluir, **Then** é
   recusado por falta de permissão.
6. **Given** um NPC que está em alguma campanha, **When** o dono tenta excluí-lo, **Then** é recusado
   informando que o NPC está em uso.

---

### User Story 2 - Levar NPCs para a campanha (Priority: P1)

O mestre inclui NPCs da sua biblioteca na campanha e os retira quando não precisa mais.

**Why this priority**: é o elo entre a biblioteca do mestre e os mapas da campanha.

**Independent Test**: como mestre, incluir dois NPCs na campanha, listar os NPCs da campanha, retirar um;
como jogador, tentar incluir (recusado).

**Acceptance Scenarios**:

1. **Given** o mestre da campanha e um NPC dele, **When** inclui o NPC na campanha, **Then** o NPC passa
   a constar na lista de NPCs da campanha.
2. **Given** o NPC já incluído na campanha, **When** o mestre tenta incluí-lo de novo, **Then** é
   recusado (o NPC aparece uma vez por campanha).
3. **Given** um usuário que não é o mestre, **When** tenta incluir ou retirar NPCs da campanha, **Then**
   é recusado.
4. **Given** um NPC de outro usuário, **When** o mestre tenta incluí-lo na campanha, **Then** é recusado
   (só NPCs da própria biblioteca).
5. **Given** a lista de NPCs da campanha, **When** o mestre consulta, **Then** vê cada NPC com nome,
   token, imagem, vida, energia e movimento.
6. **Given** um NPC da campanha com ocorrências nos mapas da campanha, **When** o mestre o retira da
   campanha, **Then** as ocorrências nos mapas também são removidas.

---

### User Story 3 - Colocar NPCs nos mapas da campanha (Priority: P2)

O mestre cria ocorrências de um NPC da campanha num mapa da campanha. Cada ocorrência começa com o nome,
a vida e a energia do NPC e tem status próprio; o mestre acompanha e altera esses valores durante o jogo
e remove a ocorrência quando o NPC sai de cena.

**Why this priority**: é o uso em jogo; depende das US1 e US2.

**Independent Test**: como mestre, criar duas ocorrências de "Goblin" no mesmo mapa, baixar a vida de uma
delas, listar as ocorrências do mapa e remover uma.

**Acceptance Scenarios**:

1. **Given** um NPC da campanha e um mapa da mesma campanha, **When** o mestre cria uma ocorrência,
   **Then** ela começa com nome, vida e energia do NPC e status vazio.
2. **Given** o mesmo NPC, **When** o mestre cria outra ocorrência no mesmo mapa, **Then** é aceita (cada
   ocorrência tem seus próprios valores).
3. **Given** uma ocorrência, **When** o mestre altera nome, vida, energia ou status, **Then** só aquela
   ocorrência muda; o NPC da biblioteca não muda.
4. **Given** um NPC que não está na campanha do mapa, ou um mapa excluído, **When** o mestre tenta criar
   uma ocorrência, **Then** é recusado.
5. **Given** um usuário que não é o mestre, **When** tenta criar, alterar ou remover ocorrências, **Then**
   é recusado.
6. **Given** um mapa da campanha, **When** o mestre ou um participante aprovado lista as ocorrências,
   **Then** vê nome, vida, energia, status e o token de cada uma; outros usuários são recusados.
7. **Given** vida ou energia de uma ocorrência, **When** alteradas, **Then** podem ficar em zero ou
   negativas (NPC caído).
8. **Given** o mestre cria uma ocorrência informando um hex livre do mapa, **When** a ocorrência é
   criada, **Then** uma peça do mapa ligada a ela é colocada nesse hex com o token do NPC, e a peça
   mostra nome, vida, energia e status da ocorrência.
9. **Given** um hex já ocupado ou fora da grid, **When** o mestre tenta criar a ocorrência nele,
   **Then** é recusado e nada é criado.
10. **Given** uma ocorrência com peça no mapa, **When** o mestre remove a ocorrência, **Then** a peça
    também sai do mapa; e remover a peça do mapa remove a ocorrência.

---

### Edge Cases

- Token do NPC excluído da biblioteca: a exclusão do token é recusada enquanto algum NPC o usar.
- Alterar o NPC da biblioteca depois de criar ocorrências: as ocorrências mantêm seus valores (são
  cópias iniciais), mas passam a usar o token/imagem atuais do NPC.
- Excluir a campanha: os NPCs da campanha e suas ocorrências nos mapas excluídos saem junto; o NPC da
  biblioteca permanece.
- Mapa excluído (soft delete): suas ocorrências não podem ser criadas nem alteradas.
- Mestre que perde a campanha (não existe hoje transferência): fora do escopo.

## Requirements *(mandatory)*

### Functional Requirements

**NPC (biblioteca)**

- **FR-001**: O usuário MUST poder cadastrar NPCs com nome (obrigatório, ≤ 260), token (obrigatório,
  existente), vida, energia e movimento (inteiros ≥ 0), ficha (≤ 20.000) e imagem opcional.
- **FR-002**: O usuário MUST poder listar (com busca por nome e paginação) e consultar só os próprios
  NPCs.
- **FR-003**: Só o dono MUST poder alterar ou excluir um NPC; um NPC incluído em alguma campanha MUST NOT
  poder ser excluído.
- **FR-004**: Um token usado por algum NPC MUST NOT poder ser excluído da biblioteca de tokens.

**NPC da campanha**

- **FR-005**: Só o mestre da campanha MUST poder incluir ou retirar NPCs da campanha; só NPCs da
  biblioteca do próprio mestre podem ser incluídos; cada NPC no máximo uma vez por campanha.
- **FR-006**: O mestre MUST poder listar os NPCs da campanha com os dados do NPC.
- **FR-007**: Retirar um NPC da campanha MUST remover as ocorrências dele nos mapas da campanha.

**NPC do mapa**

- **FR-008**: Só o mestre da campanha MUST poder criar, alterar e remover ocorrências de NPC nos mapas
  da campanha; o NPC MUST estar na campanha do mapa e o mapa MUST NOT estar excluído.
- **FR-009**: Cada ocorrência MUST começar com nome, vida e energia do NPC e status vazio; o mestre MUST
  poder alterar nome (≤ 260), vida, energia (inteiros, podem ser ≤ 0) e status (≤ 260) só daquela
  ocorrência.
- **FR-012**: Cada NPC do mapa MUST estar ligado a exatamente uma peça do mapa (posição coluna/linha e
  direção), criada junto com ele num hex livre e dentro da grid, usando o token do NPC; a peça MUST
  exibir nome, vida, energia e status do NPC do mapa; remover um remove o outro.
- **FR-010**: O mestre e os participantes aprovados da campanha MUST poder listar as ocorrências de um
  mapa; demais usuários MUST ser recusados.
- **FR-011**: Todas as recusas MUST informar o motivo (dados inválidos, sem permissão, não encontrado ou
  conflito).

### Key Entities

- **NPC**: dono, token (obrigatório), nome, vida, energia, movimento, ficha, imagem (opcional), datas.
- **NPC da campanha**: campanha + NPC (único por campanha).
- **NPC do mapa**: mapa + NPC, com nome, vida, energia e status próprios; várias por NPC e por mapa;
  ligado a uma **peça do mapa** (existente), que guarda posição e direção e usa o token do NPC.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de alterar/excluir NPC de outro usuário são recusadas.
- **SC-002**: 100% das tentativas de incluir/retirar NPCs de campanha ou de mapa por quem não é o
  mestre são recusadas.
- **SC-003**: Alterar uma ocorrência de NPC nunca muda outra ocorrência nem o NPC da biblioteca (0 casos
  nos testes).
- **SC-004**: Nenhuma exclusão deixa registros órfãos: NPC em campanha, token em NPC e NPC da campanha
  com ocorrências são tratados em 100% dos casos (recusa ou remoção em conjunto, conforme as regras).

## Assumptions

- Escopo só de backend; as telas (biblioteca de NPCs, NPCs da campanha, NPCs no mapa) virão depois.
- A imagem do NPC segue a regra das imagens dos personagens (arquivo enviado pelo upload existente).
- Participantes aprovados podem ver as ocorrências no mapa (nome, vida, energia, status e token), mas
  não a ficha do NPC nem a lista de NPCs da campanha, que são do mestre.
- As peças NPC já existentes (criadas pelo menu "Incluir token" da feature 011, sem NPC da biblioteca)
  continuam funcionando como hoje; só as peças criadas por um NPC do mapa ficam ligadas a ele.
