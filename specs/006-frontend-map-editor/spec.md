# Feature Specification: Frontend — Login e Editor de Mapa

**Feature Branch**: `006-frontend-map-editor`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "Agora vamos criar o frontend em React: tela de login simples; layout só dark mode; a tela principal é sempre o mapa com a grid e um menu, todas as outras janelas abrem em modal; botões no canto inferior direito (zoom in/out, imagem+ com upload ou busca de mapas, redimensionamento da imagem guardando left/top/width/height); rodapé com o tamanho do mapa em hexágonos, editável em modal e salvo só ao salvar o mapa; toda ação exibe toast; menu com campanha atual (modal: minhas campanhas, buscar campanhas com proprietário, nova campanha) e mapa atual (modal: mapas da campanha, meus mapas, buscar mapas), botão de salvar quando o mapa não está salvo, salvar pede nome se o mapa ainda não existe. Personagens e tokens ficam para depois."

## Clarifications

### Session 2026-09-25

- Q: Um mapa novo salvo pela primeira vez entra na campanha atual? → A: Sim, automaticamente,
  quando há campanha atual e o usuário é o mestre dela.
- Q: O que acontece ao alterar um mapa da biblioteca de outro usuário? → A: Pode editar; ao
  salvar, o sistema cria uma cópia em nome do usuário, pedindo o nome (o original não muda).

## Conceitos

- **Mapa atual**: o que está desenhado na tela — imagem do cenário, ajuste da imagem (posição e
  tamanho) e tamanho da grid em hexágonos. Corresponde a um modelo de mapa da biblioteca.
- **Mapa não salvo**: mapa novo que ainda não existe na biblioteca, ou mapa existente com
  alterações ainda não gravadas (imagem, ajuste ou tamanho da grid).
- **Campanha atual**: a campanha escolhida no menu; define a lista "Mapas da campanha".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar no sistema (Priority: P1)

A pessoa abre o sistema, vê uma tela de login simples em modo escuro, entra com e-mail e senha
e chega na tela principal. Quem ainda não tem conta cria uma na mesma tela.

**Why this priority**: sem login nada mais funciona.

**Independent Test**: criar conta, entrar, recarregar a página e continuar logado; sair e voltar
à tela de login.

**Acceptance Scenarios**:

1. **Given** um usuário cadastrado, **When** ele entra com e-mail e senha corretos, **Then** vê
   a tela principal e um toast de boas-vindas.
2. **Given** credenciais erradas, **When** ele tenta entrar, **Then** continua na tela de login e
   vê um toast de erro.
3. **Given** um usuário logado, **When** ele recarrega a página, **Then** continua logado.
4. **Given** um usuário logado, **When** ele sai pelo menu, **Then** volta para a tela de login.
5. **Given** uma pessoa sem conta, **When** ela preenche nome, e-mail e senha em "criar conta",
   **Then** a conta é criada e ela já entra no sistema.

---

### User Story 2 - Ver o mapa com a grid e navegar (Priority: P1)

A tela principal mostra sempre o mapa ocupando a tela, com a grid de hexágonos (lado reto em
cima) sobre a imagem do cenário. O usuário aproxima e afasta com os botões de zoom e arrasta o
mapa para navegar. O rodapé mostra o tamanho da grid em hexágonos.

**Why this priority**: é o centro do produto; todas as outras funções giram em torno dele.

**Independent Test**: com um mapa carregado, dar zoom in/out, arrastar o mapa e conferir que a
grid acompanha a imagem; conferir o tamanho no rodapé.

**Acceptance Scenarios**:

1. **Given** a tela principal, **When** nenhum mapa foi escolhido, **Then** aparece uma grid
   vazia no tamanho padrão (20 × 20) e o rodapé mostra "20 × 20".
2. **Given** um mapa com imagem, **When** ele é aberto, **Then** a imagem aparece com o ajuste
   salvo e a grid desenhada por cima, com hexágonos no tamanho calculado pela regra do projeto.
3. **Given** o mapa na tela, **When** o usuário clica em zoom in ou zoom out, **Then** a
   visualização aproxima ou afasta mantendo a grid alinhada à imagem.
4. **Given** o mapa na tela, **When** o usuário arrasta o fundo, **Then** a visualização se move.

---

### User Story 3 - Escolher a campanha atual (Priority: P1)

No menu, a campanha atual aparece como um campo de seleção. Ao clicar, abre um modal com três
abas: "Minhas campanhas", "Buscar campanhas" (com o nome do dono) e "Nova campanha".

**Why this priority**: a campanha define quais mapas estão disponíveis para a mesa.

**Independent Test**: criar uma campanha na aba "Nova campanha", ver que ela vira a campanha
atual; buscar campanhas de outros usuários e ver o nome do dono.

**Acceptance Scenarios**:

1. **Given** o modal de campanhas, **When** o usuário abre "Minhas campanhas", **Then** vê só as
   campanhas das quais é dono; ao escolher uma, ela vira a campanha atual e o modal fecha.
2. **Given** a aba "Buscar campanhas", **When** ele digita parte do nome, **Then** vê as campanhas
   de todos os usuários que combinam, com o nome do dono e se é aberta ou fechada.
3. **Given** a aba "Nova campanha", **When** ele informa nome e se é aberta e confirma, **Then** a
   campanha é criada, vira a campanha atual e aparece um toast de sucesso.
4. **Given** uma campanha atual escolhida, **When** o usuário recarrega a página, **Then** ela
   continua como campanha atual.

---

### User Story 4 - Montar o mapa: imagem, ajuste e tamanho da grid (Priority: P1)

Pelo botão "imagem+" o usuário envia uma imagem de cenário ou reaproveita a imagem de um mapa da
biblioteca. Pelo botão de redimensionamento ele move e redimensiona a imagem na tela para
alinhá-la à grid. Clicando no tamanho da grid no rodapé, ele altera colunas e linhas. Nada disso é
gravado até ele salvar o mapa.

**Why this priority**: é o trabalho principal do mestre antes da sessão.

**Independent Test**: enviar uma imagem, redimensioná-la e movê-la, mudar a grid para 12 × 9,
salvar, recarregar e conferir que tudo volta igual.

**Acceptance Scenarios**:

1. **Given** o modal "imagem+", **When** o usuário envia uma imagem PNG, JPEG ou WebP, **Then** ela
   aparece sob a grid no tamanho original e o mapa passa a "não salvo".
2. **Given** o modal "imagem+", **When** ele escolhe a aba de busca e seleciona um mapa da
   biblioteca, **Then** a imagem desse mapa passa a ser a imagem do mapa atual.
3. **Given** o mapa atual não salvo, **When** o usuário abre "imagem+", **Then** o sistema
   pergunta se ele deseja salvar antes de continuar (salvar, descartar ou cancelar).
4. **Given** o modo de redimensionamento ligado, **When** o usuário arrasta a imagem ou as alças
   de tamanho, **Then** a imagem muda de posição e tamanho na tela e os valores de posição
   (esquerda, topo) e tamanho (largura, altura) ficam guardados para o salvamento.
5. **Given** o modo de redimensionamento, **When** o usuário clica no botão de novo, **Then** o
   modo desliga e a imagem não pode mais ser arrastada.
6. **Given** o rodapé, **When** o usuário clica no tamanho da grid e informa 12 colunas × 9
   linhas, **Then** a grid é redesenhada em 12 × 9 e o mapa passa a "não salvo".
7. **Given** tamanho de grid fora de 1 a 500, **When** o usuário confirma, **Then** o valor é
   recusado com mensagem.

---

### User Story 5 - Escolher e salvar o mapa atual (Priority: P1)

No menu, o mapa atual aparece como um campo de seleção. Ao clicar, abre um modal com três abas:
"Mapas da campanha", "Meus mapas" e "Buscar mapas". Quando o mapa atual não está salvo, o menu
mostra um botão "Salvar mapa": se o mapa já existe, salva direto; se é novo, pede o nome.

**Why this priority**: sem salvar, o trabalho da US4 se perde.

**Independent Test**: montar um mapa novo, salvar informando o nome, abrir outro mapa pelo modal
e voltar ao primeiro pela aba "Meus mapas".

**Acceptance Scenarios**:

1. **Given** um mapa novo não salvo, **When** o usuário clica em "Salvar mapa", **Then** um modal
   pede o nome; ao confirmar, o mapa é gravado, deixa de estar "não salvo" e aparece um toast.
2. **Given** um mapa existente com alterações, **When** o usuário clica em "Salvar mapa", **Then**
   as alterações são gravadas sem pedir nome.
3. **Given** um mapa salvo e sem alterações, **When** o usuário olha o menu, **Then** o botão
   "Salvar mapa" não aparece.
4. **Given** o modal de mapas, **When** o usuário abre "Mapas da campanha", **Then** vê os mapas
   da campanha atual; sem campanha atual, a aba explica que é preciso escolher uma.
5. **Given** a aba "Meus mapas", **When** ela abre, **Then** lista os mapas da biblioteca dos
   quais o usuário é dono; "Buscar mapas" busca na biblioteca de todos por nome ou descrição.
6. **Given** o mapa atual não salvo, **When** o usuário escolhe outro mapa, **Then** o sistema
   pergunta se deseja salvar antes (salvar, descartar ou cancelar).
7. **Given** um mapa novo e uma campanha atual da qual o usuário é mestre, **When** o mapa é
   salvo pela primeira vez, **Then** ele também é colocado na campanha atual e aparece em "Mapas
   da campanha".
8. **Given** um mapa novo e nenhuma campanha atual (ou campanha de outro mestre), **When** ele é
   salvo, **Then** fica só na biblioteca, sem erro.
9. **Given** um mapa da biblioteca de outro usuário, alterado, **When** o usuário clica em
   "Salvar mapa", **Then** o sistema pede um nome e grava uma cópia em nome dele; o mapa atual
   passa a ser a cópia e o original não muda.

---

### Edge Cases

- Mapa da biblioteca de outro usuário aberto e alterado: ao salvar vira uma cópia do usuário
  (US5, cenário 9); a cópia segue a regra de entrar na campanha atual.
- Campanha atual de outro mestre (usuário é participante aprovado): os mapas da campanha podem ser
  vistos, mas não alterados; botões de edição ficam desabilitados.
- Sessão expirada: qualquer ação leva de volta à tela de login com um toast explicando.
- Falha de rede ou do servidor: toast de erro; o mapa atual e as alterações não salvas permanecem.
- Imagem inválida (formato ou tamanho acima de 10 MB): toast com o motivo; o mapa não muda.
- Fechar ou recarregar a página com mapa não salvo: o navegador pede confirmação.
- Zoom tem limites mínimo e máximo; botões ficam desabilitados nos limites.

## Requirements *(mandatory)*

### Functional Requirements

**Geral**

- **FR-001**: A interface MUST usar apenas tema escuro.
- **FR-002**: Fora da tela de login, a tela principal MUST ser sempre o mapa com a grid e o menu;
  todas as outras janelas MUST abrir como modal sobre ela.
- **FR-003**: Toda ação que grava, carrega ou falha MUST exibir uma mensagem breve (toast) de
  sucesso ou erro.
- **FR-004**: Os textos da interface MUST estar em português do Brasil, preparados para tradução.

**Login**

- **FR-005**: A tela de login MUST ter e-mail, senha, botão entrar e acesso a "criar conta" (nome,
  e-mail, senha).
- **FR-006**: A sessão MUST sobreviver a recarregamentos até o usuário sair ou o acesso expirar.

**Mapa e grid**

- **FR-007**: O mapa MUST desenhar a grid de hexágonos de lado reto em cima, com colunas × linhas
  do mapa atual e o tamanho de hexágono calculado pela mesma regra do servidor (a grid cabe na área
  visível da imagem ajustada).
- **FR-008**: A imagem do cenário MUST ficar sob a grid, com a posição e o tamanho de exibição do
  mapa atual; a imagem original não é alterada.
- **FR-009**: Botões no canto inferior direito MUST oferecer zoom in, zoom out, "imagem+" e
  redimensionamento; arrastar o fundo MUST mover a visualização.
- **FR-010**: O rodapé MUST mostrar o tamanho da grid em hexágonos (colunas × linhas); ao clicar,
  MUST abrir um modal para editar esses valores (1 a 500).
- **FR-011**: O modo de redimensionamento MUST permitir mover e redimensionar a imagem na tela e
  MUST guardar esquerda, topo, largura e altura para o salvamento.
- **FR-012**: O modal "imagem+" MUST ter duas abas: enviar imagem e buscar mapas da biblioteca
  (para reaproveitar a imagem).

**Menu — campanha**

- **FR-013**: O menu MUST mostrar a campanha atual como um campo de seleção que abre um modal com
  as abas "Minhas campanhas", "Buscar campanhas" (com dono e aberta/fechada) e "Nova campanha".
- **FR-014**: A campanha atual MUST ser lembrada entre recarregamentos.

**Menu — mapa**

- **FR-015**: O menu MUST mostrar o mapa atual como um campo de seleção que abre um modal com as
  abas "Mapas da campanha", "Meus mapas" e "Buscar mapas".
- **FR-016**: Quando o mapa atual não estiver salvo, o menu MUST mostrar o botão "Salvar mapa".
- **FR-017**: Salvar um mapa existente do próprio usuário MUST gravar imagem, ajuste da imagem e
  tamanho da grid sem pedir nada; salvar um mapa novo, ou um mapa de outro usuário, MUST pedir o
  nome em um modal e criar um mapa novo na biblioteca em nome do usuário.
- **FR-020**: Ao criar um mapa novo (inclusive cópia), se houver campanha atual da qual o usuário
  é mestre, o mapa MUST ser colocado nessa campanha; caso contrário fica só na biblioteca.
- **FR-018**: Trocar de mapa ou abrir "imagem+" com o mapa atual não salvo MUST perguntar se o
  usuário deseja salvar, descartar ou cancelar.
- **FR-019**: Alterações de imagem, ajuste e grid MUST ser gravadas apenas quando o mapa é salvo.

### Key Entities *(include if feature involves data)*

- **Sessão**: usuário logado e sua credencial de acesso.
- **Campanha atual**: campanha escolhida no menu (lembrada entre recarregamentos).
- **Mapa atual (rascunho)**: imagem, ajuste (esquerda, topo, largura, altura), colunas × linhas,
  nome e se já existe na biblioteca; marca "não salvo" quando difere do que foi gravado.
- **Visualização**: nível de zoom e deslocamento da tela (não são gravados).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário novo cria conta e chega ao mapa em menos de 1 minuto.
- **SC-002**: Um mestre monta um mapa (imagem, ajuste e grid) e o salva em menos de 3 minutos.
- **SC-003**: Depois de salvar e recarregar, 100% dos mapas voltam com a mesma imagem, ajuste e
  grid.
- **SC-004**: Zoom e arraste respondem sem atraso perceptível em mapas de até 100 × 100 hexágonos.
- **SC-005**: 100% das ações de gravar, carregar ou falhar mostram um toast.
- **SC-006**: Nenhuma alteração não salva é perdida sem que o usuário confirme.

## Assumptions

- Personagens, tokens no mapa, convites e pedidos de acesso ficam para próximas features.
- "Minhas campanhas" = campanhas das quais o usuário é mestre; campanhas em que ele só participa
  aparecem em "Buscar campanhas".
- "Meus mapas" = mapas da biblioteca dos quais o usuário é dono; "Buscar mapas" = biblioteca de
  todos; "Mapas da campanha" = mapas da campanha atual.
- A tela de login inclui "criar conta", porque sem isso não há como obter acesso.
- Zoom em passos de 10% a 400%; posição e zoom da visualização não são gravados.
- Os valores de ajuste da imagem gravados são os do modelo de mapa (posição e tamanho de exibição
  da feature 002); a imagem original fica intacta.
- Interface pensada para computador (desktop); uso em celular não é objetivo desta feature.
