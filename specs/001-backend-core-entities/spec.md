# Feature Specification: Backend das Entidades Principais

**Feature Branch**: `001-backend-core-entities`
**Created**: 2026-09-24
**Status**: Draft
**Input**: User description: "Crie o projeto da WebApi, apenas o backend por enquanto, com as entidades User, Character, Token, Campaign, MapModel, Map e MapToken. Crie os domínios, serviços e controllers para usar essas entidades."

## Clarifications

### Session 2026-09-24

- Q: O token no mapa já guarda a posição no grid nesta feature? → A: Sim, apenas a posição
  axial (q, r); orientação em pé/deitado fica para depois.
- Q: Quem vê os itens nas listagens de Token, MapModel e Campaign? → A: Token e MapModel são
  biblioteca compartilhada (todos os usuários); Campaign lista apenas as do usuário.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conta de usuário (Priority: P1)

Uma pessoa cria uma conta informando nome, e-mail e senha, entra no sistema com e-mail e senha,
pode alterar o próprio nome e trocar a própria senha.

**Why this priority**: todas as outras operações dependem de saber quem é o usuário e do que ele
é dono.

**Independent Test**: criar uma conta, entrar, renomear e trocar a senha; entrar de novo com a
senha nova.

**Acceptance Scenarios**:

1. **Given** um e-mail ainda não cadastrado, **When** a pessoa se cadastra com nome, e-mail e
   senha válidos, **Then** a conta é criada e ela consegue entrar com essas credenciais.
2. **Given** um e-mail já cadastrado, **When** alguém tenta se cadastrar com ele, **Then** o
   cadastro é recusado com mensagem informando que o e-mail já está em uso.
3. **Given** um usuário autenticado, **When** ele altera o nome, **Then** apenas o nome muda;
   e-mail e senha permanecem iguais.
4. **Given** um usuário autenticado, **When** ele troca a senha informando a senha atual
   correta e uma nova senha válida, **Then** a senha antiga deixa de funcionar e a nova passa a
   funcionar.
5. **Given** um usuário autenticado, **When** ele tenta trocar a senha com a senha atual
   errada, **Then** a troca é recusada.

---

### User Story 2 - Biblioteca de modelos de mapa (Priority: P2)

Um usuário cadastra modelos de mapa (nome, descrição e imagem), lista-os de forma paginada,
busca por nome ou descrição, edita e exclui os que são seus.

**Why this priority**: um mapa de campanha é sempre criado a partir de um modelo; sem modelos
não há mapas.

**Independent Test**: cadastrar dois modelos com imagem, listar paginado, buscar por um termo
da descrição, editar um e excluir o outro.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cadastra um modelo com nome, descrição e
   imagem, **Then** o modelo é salvo com ele como dono e com data de criação registrada.
2. **Given** um modelo existente, **When** ele é editado, **Then** a data de alteração é
   atualizada e a data de criação não muda.
3. **Given** vários modelos, **When** o usuário busca por um termo, **Then** retornam apenas
   modelos cujo nome ou descrição contém o termo, sem diferenciar maiúsculas de minúsculas,
   paginados.
4. **Given** um modelo de outro usuário, **When** o usuário tenta excluí-lo, **Then** a exclusão
   é recusada.

---

### User Story 3 - Campanhas e seus mapas (Priority: P2)

Um usuário cria campanhas, renomeia e exclui as suas. Dentro de uma campanha, cria mapas a
partir de modelos de mapa; cada mapa recebe automaticamente o nome do modelo seguido de um
número. O usuário lista os mapas da campanha paginados, altera o status (ativo, arquivado) e
exclui mapas.

**Why this priority**: campanha e mapa são o espaço onde a sessão de jogo acontece.

**Independent Test**: criar uma campanha, criar dois mapas do mesmo modelo nela, verificar os
nomes "<Modelo> 1" e "<Modelo> 2", arquivar um, excluir outro, listar.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cria uma campanha com um nome, **Then** a
   campanha é salva com ele como dono.
2. **Given** uma campanha do usuário, **When** ele altera o nome, **Then** somente o nome muda.
3. **Given** uma campanha que já tem um mapa "Masmorra 1" criado do modelo "Masmorra",
   **When** o dono cria outro mapa desse modelo na mesma campanha, **Then** o novo mapa recebe
   o nome "Masmorra 2".
4. **Given** um mapa ativo, **When** o dono o arquiva, **Then** o status passa a Archived e ele
   continua listado na campanha.
5. **Given** um mapa, **When** o dono o exclui, **Then** o status passa a Deleted e ele deixa de
   aparecer na listagem da campanha.
6. **Given** uma campanha de outro usuário, **When** o usuário tenta excluí-la ou criar mapas
   nela, **Then** a operação é recusada.

---

### User Story 4 - Biblioteca de tokens (Priority: P3)

Um usuário cadastra tokens com nome, descrição, espaço ocupado em pé (UpSpace, padrão 1) e
deitado (DownSpace, padrão 2), e duas imagens (em pé e deitado). Lista paginado, busca por nome
ou descrição, edita e exclui apenas os seus.

**Why this priority**: tokens são a base das peças colocadas nos mapas.

**Independent Test**: cadastrar um token sem informar os espaços e verificar os valores 1 e 2;
buscar, editar e excluir.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cadastra um token sem informar UpSpace e
   DownSpace, **Then** o token é salvo com UpSpace = 1 e DownSpace = 2.
2. **Given** um token de outro usuário, **When** o usuário tenta alterá-lo ou excluí-lo,
   **Then** a operação é recusada.
3. **Given** vários tokens, **When** o usuário busca por um termo, **Then** retornam apenas
   tokens cujo nome ou descrição contém o termo, paginados.

---

### User Story 5 - Tokens no mapa (Priority: P3)

O dono de um mapa coloca tokens nele. Cada token no mapa tem nome, tipo (Character, Npc, Enemy,
Object), ficha em markdown, vida, energia, status e movimento próprios. O dono lista os tokens
do mapa, altera e remove.

**Why this priority**: é o que torna o mapa jogável, mas depende de mapas e tokens existirem.

**Independent Test**: em um mapa existente, incluir um token do tipo Enemy, alterar a vida,
listar os tokens do mapa e remover.

**Acceptance Scenarios**:

1. **Given** um mapa do usuário e um token da biblioteca, **When** ele inclui esse token no
   mapa com tipo Enemy, **Then** o token do mapa aparece na listagem daquele mapa.
2. **Given** dois tokens no mapa criados a partir do mesmo token da biblioteca, **When** a vida
   de um é alterada, **Then** a vida do outro não muda.
3. **Given** um mapa de outro usuário, **When** o usuário tenta excluir um token desse mapa,
   **Then** a exclusão é recusada.
4. **Given** um token no mapa na posição (0, 0), **When** o dono do mapa o move para (2, -1),
   **Then** a listagem do mapa mostra o token na posição (2, -1).

---

### User Story 6 - Personagens (Priority: P4)

Um usuário cadastra seus personagens com nome, ficha em markdown, vida, energia, status,
movimento e imagem. Ele vê somente os próprios personagens, edita e exclui.

**Why this priority**: útil para jogadores, mas não bloqueia o uso de mapas.

**Independent Test**: dois usuários cadastram personagens; cada um lista e vê apenas os seus.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cadastra um personagem, **Then** o
   personagem é salvo com ele como dono.
2. **Given** personagens de vários usuários, **When** um usuário lista personagens, **Then**
   recebe apenas os dele.
3. **Given** um personagem de outro usuário, **When** o usuário tenta alterá-lo ou excluí-lo,
   **Then** a operação é recusada.

---

### Edge Cases

- Excluir um token da biblioteca que está em uso em algum mapa: a exclusão é bloqueada com
  mensagem explicando que ele está em uso.
- Excluir um modelo de mapa usado por algum mapa: a exclusão é bloqueada.
- Excluir uma campanha que ainda tem mapas não excluídos: a exclusão é bloqueada.
- Numeração de mapas: mapas com status Deleted continuam contando; um mapa novo nunca reutiliza
  o número de um mapa anterior do mesmo modelo na mesma campanha.
- Página solicitada além do total: retorna lista vazia com o total de itens correto.
- Tamanho de página acima do máximo permitido: é limitado ao máximo.
- Upload de arquivo que não é imagem ou acima do tamanho máximo: recusado.
- Valores numéricos negativos para UpSpace, DownSpace ou Move: recusados. Vida e energia podem
  ser zero ou negativas (personagem caído).
- Qualquer operação sem estar autenticado, exceto cadastro e login: recusada.

## Requirements *(mandatory)*

### Functional Requirements

**Usuário**

- **FR-001**: O sistema MUST permitir cadastro com nome, e-mail e senha.
- **FR-002**: O e-mail MUST ser único e em formato válido; a senha MUST ter no mínimo 8
  caracteres.
- **FR-003**: O sistema MUST permitir login com e-mail e senha.
- **FR-004**: O usuário MUST poder alterar apenas o próprio nome.
- **FR-005**: O usuário MUST poder trocar a própria senha, informando a senha atual.
- **FR-006**: Senhas MUST NOT ser armazenadas nem retornadas em texto legível.

**Personagem (Character)**

- **FR-007**: O usuário MUST poder cadastrar, alterar e excluir personagens com nome, ficha
  (markdown), vida, energia, status (texto), movimento e imagem.
- **FR-008**: A listagem de personagens MUST retornar apenas os do usuário autenticado.
- **FR-009**: Alterar e excluir personagem MUST ser permitido apenas ao dono.

**Token**

- **FR-010**: O usuário MUST poder cadastrar tokens com nome, descrição, UpSpace (padrão 1),
  DownSpace (padrão 2), imagem em pé e imagem deitado; o usuário que cadastra é o dono.
- **FR-011**: O sistema MUST listar tokens paginados e buscar por nome ou descrição, paginado.
- **FR-012**: Alterar e excluir token MUST ser permitido apenas ao dono.

**Campanha (Campaign)**

- **FR-013**: O usuário MUST poder criar campanhas com nome; quem cria é o dono.
- **FR-014**: O sistema MUST listar campanhas paginadas.
- **FR-015**: Alterar nome e excluir campanha MUST ser permitido apenas ao dono.

**Modelo de mapa (MapModel)**

- **FR-016**: O usuário MUST poder cadastrar modelos com nome, descrição e imagem; o sistema
  registra dono, data de criação e data da última alteração.
- **FR-017**: O sistema MUST listar modelos paginados e buscar por nome ou descrição, paginado.
- **FR-018**: Alterar e excluir modelo MUST ser permitido apenas ao dono.

**Mapa (Map)**

- **FR-019**: O dono de uma campanha MUST poder criar mapas nela a partir de um modelo de mapa.
- **FR-020**: O nome do mapa MUST ser gerado como "<nome do modelo> <n>", onde n é o próximo
  número sequencial para aquele modelo naquela campanha, começando em 1.
- **FR-021**: O mapa MUST ter status Active, Archived ou Deleted; novo mapa começa Active.
- **FR-022**: O sistema MUST listar os mapas de uma campanha paginados, sem os de status
  Deleted.
- **FR-023**: Alterar mapa (nome e status) e excluir mapa MUST ser permitido apenas ao dono do
  mapa. Excluir muda o status para Deleted, sem apagar o registro.

**Token no mapa (MapToken)**

- **FR-024**: O dono de um mapa MUST poder incluir tokens nele informando o token da
  biblioteca, nome, tipo (Character, Npc, Enemy, Object), ficha (markdown), vida, energia,
  status e movimento.
- **FR-025**: Cada token no mapa MUST ter valores próprios, independentes do token da
  biblioteca e de outros tokens no mapa.
- **FR-026**: O sistema MUST listar os tokens de um mapa.
- **FR-027**: Alterar e excluir tokens de um mapa MUST ser permitido apenas ao dono do mapa.
- **FR-028**: Token no mapa MUST ter posição no grid hexagonal do mapa em coordenadas axiais
  (q, r); o dono do mapa MUST poder alterar essa posição. Orientação em pé/deitado fica fora
  deste escopo.

**Transversais**

- **FR-029**: Imagens (personagem, token, modelo de mapa) MUST ser enviadas pelo usuário e
  armazenadas em armazenamento de arquivos; o registro guarda a referência da imagem.
- **FR-030**: Uploads MUST aceitar apenas imagens (PNG, JPEG, WebP) de até 10 MB.
- **FR-031**: Listagens paginadas MUST aceitar número e tamanho da página (padrão 20, máximo
  100) e retornar o total de itens.
- **FR-032**: Todas as operações, exceto cadastro e login, MUST exigir usuário autenticado.
- **FR-033**: Registros em uso por outros (token em mapa, modelo em mapa, campanha com mapas)
  MUST NOT ser excluídos; a operação retorna mensagem explicando o bloqueio.
- **FR-034**: Listagens e buscas de tokens e de modelos de mapa MUST mostrar itens de todos
  os usuários (biblioteca compartilhada); a listagem de campanhas MUST mostrar apenas as
  campanhas do usuário autenticado. *(Substituído pela feature 005: a listagem de campanhas
  mostra todas as campanhas, com o nome do dono — ver `specs/005-campaign-characters/spec.md`.)*
- **FR-035**: Tentativas de alterar ou excluir registros de outro usuário MUST ser recusadas
  sem alterar nada.

### Key Entities *(include if feature involves data)*

- **User**: pessoa que usa o sistema. Nome, e-mail (único), senha. Dono de personagens, tokens,
  campanhas, modelos de mapa e mapas.
- **Character**: personagem de um jogador. Nome, ficha (markdown), vida, energia, status,
  movimento, imagem, dono.
- **Token**: peça reutilizável da biblioteca. Nome, descrição, UpSpace, DownSpace, imagem em
  pé, imagem deitado, dono.
- **Campaign**: aventura. Nome, dono. Contém mapas.
- **MapModel**: modelo reutilizável de mapa. Nome, descrição, imagem, dono, data de criação,
  data de alteração.
- **Map**: instância de um MapModel dentro de uma Campaign. Nome gerado, modelo, campanha,
  dono, status (Active, Archived, Deleted). Contém tokens no mapa.
- **MapToken**: token colocado em um mapa. Mapa, token de origem, nome, tipo (Character, Npc,
  Enemy, Object), ficha (markdown), vida, energia, status, movimento, posição axial (q, r).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa nova consegue criar conta e entrar em menos de 1 minuto.
- **SC-002**: Um usuário consegue criar uma campanha, um modelo de mapa e um mapa com um token
  incluído em menos de 5 minutos.
- **SC-003**: 100% das tentativas de alterar ou excluir registros de outro usuário são
  recusadas nos testes de aceitação.
- **SC-004**: Listagens e buscas paginadas respondem em até 1 segundo com 10.000 registros na
  entidade.
- **SC-005**: Todas as operações listadas para as sete entidades estão disponíveis e cobertas
  por pelo menos um cenário de aceitação.

## Assumptions

- Escopo: apenas o backend (API). Frontend, grid visual e tempo real ficam para outras features.
- Token não tinha dono na descrição, mas "alterar/excluir apenas os meus" exige um; o usuário
  que cadastra o token é o dono.
- MapToken pertence a um Map (implícito em "listar os do mapa").
- Campanha tem só o dono; não há jogadores convidados nesta feature.
- Excluir mapa é exclusão lógica (status Deleted); as demais exclusões removem o registro.
- Personagem e MapToken são independentes: um personagem não é vinculado automaticamente a um
  token no mapa nesta feature.
- A troca de senha exige a senha atual; recuperação de senha por e-mail está fora do escopo.
- Usuários, autenticação e armazenamento de imagens são implementados pelo próprio sistema,
  sem serviços externos de identidade; a forma técnica é decidida no plano.
