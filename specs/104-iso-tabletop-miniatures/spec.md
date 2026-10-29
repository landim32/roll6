# Feature Specification: Miniaturas de mesa na vista isométrica

**Feature Branch**: `104-iso-tabletop-miniatures`  
**Created**: 2026-10-29  
**Status**: Draft  
**Input**: User description: "Melhoria no 3D Isometrico: Preciso que trate o tokens em 3D como miniaturas de mesa; No isometrico usa apenas a peça parada; Deve criar uma base circular para o objeto 3D; Quando o token estiver caido ou fora de combate, ele tratar como um peça caída"

## Contexto

A vista isométrica (103) desenha cada peça com o modelo 3D do token parado na primeira pose de "Parado", senão a figura
2,5D em pé, senão a imagem do token no chão; nela **toda postura aparece em pé** (caído e fora de combate não mudam o
desenho). Esta melhoria faz os tokens com modelo 3D parecerem **miniaturas de mesa** — uma figura rígida, sem animação, de
pé sobre uma **base circular** — e faz a miniatura **tombar** quando a peça está caída ou fora de combate, como uma
miniatura derrubada sobre a mesa. Só a vista isométrica muda; o 2D e a vista 3D atual continuam iguais.

## Clarifications

### Session 2026-10-29

- Q: Como deve aparecer a miniatura caída? → A: A miniatura inteira (modelo na pose "Parado" e base) tomba de lado no
  chão, como uma peça derrubada na mesa.
- Q: Os tokens sem modelo 3D (figura 2,5D em pé) também ganham base circular? → A: Sim para figuras 2,5D (recorte sobre a
  base, que tomba junto quando caída); a imagem no chão continua sem base.
- Q: "Caído" e "Fora de combate" devem ter aparência diferente? → A: As duas tombadas; fora de combate também em preto e
  branco (modelo/figura/imagem sem cor), como no 2D.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — O modelo 3D como miniatura sobre base circular (Priority: P1)

Na vista isométrica, cada peça cujo token tem modelo 3D aparece como uma miniatura de mesa: o modelo, **sempre parado**
(sem animação nenhuma), de pé sobre uma **base circular** fina apoiada no chão, centrada na peça. A borda da base tem a cor
da peça no 2D (azul personagem, vermelho NPC, verde-água aliado, cinza objeto), para que se saiba de quem é cada
miniatura sem precisar olhar os hexes.

**Why this priority**: É o pedido central — dar à vista a aparência de uma mesa com miniaturas.

**Independent Test**: Abrir a isométrica num mapa com um personagem e um NPC com modelo 3D dentro da luz: os dois aparecem
parados, cada um em pé sobre uma base redonda, a do personagem com borda azul e a do NPC com borda vermelha.

**Acceptance Scenarios**:

1. **Given** um token com modelo 3D numa peça iluminada, **When** a vista isométrica aparece, **Then** o modelo aparece de pé
   sobre uma base circular centrada na peça, com os pés apoiados no topo da base.
2. **Given** o modelo tem animação de "Parado" (do arquivo ou da biblioteca), **When** ele aparece na isométrica, **Then** ele
   fica imóvel na primeira pose dessa animação (ou na pose de repouso, se não houver), sem tocar animação nenhuma.
3. **Given** peças de tipos diferentes (personagem, NPC inimigo/neutro, aliado, objeto), **When** aparecem na isométrica,
   **Then** a borda da base de cada uma tem a cor do tipo da peça no 2D.
4. **Given** uma peça que ocupa mais de um hex (tamanho 2, 3, 7 ou 10), **When** aparece, **Then** a base é maior,
   proporcional ao tamanho da peça, e o modelo fica no centro dela.
5. **Given** a peça muda de lugar, de direção ou de token, **When** a mudança chega pelo tempo real, **Then** a miniatura e a
   base vão juntas para o novo lugar/direção.
6. **Given** a base cruza a borda do círculo de luz, **When** a vista é desenhada, **Then** a base é cortada na borda da luz
   como o modelo (só a parte de dentro aparece).

---

### User Story 2 — Miniatura tombada quando a peça está caída ou fora de combate (Priority: P1)

Quando o personagem ou NPC está **caído** ou **fora de combate**, a miniatura aparece **tombada**: o conjunto inteiro —
modelo e base — deitado de lado no chão, como uma miniatura derrubada na mesa. A pose continua a de "Parado" (a miniatura
é rígida: não toca a animação de caído). Ao voltar a ficar em pé, a miniatura volta a ficar de pé.

**Why this priority**: É o único jeito de ver, na isométrica, quem está fora da luta; hoje todos aparecem em pé.

**Independent Test**: Mudar a postura de um personagem com modelo para "Caído": na isométrica a miniatura dele aparece
deitada no chão com a base de pé virada para o lado; voltar para "Em pé": a miniatura levanta.

**Acceptance Scenarios**:

1. **Given** uma peça com modelo em pé, **When** a postura muda para "Caído" (por qualquer pessoa, pelo tempo real),
   **Then** a miniatura aparece tombada: modelo e base deitados no chão, sobre os hexes da peça.
2. **Given** uma peça com modelo, **When** a postura é "Fora de combate", **Then** a miniatura aparece tombada como em
   "Caído" e, além disso, em preto e branco (o modelo e as armas sem cor), como a peça fora de combate no 2D.
3. **Given** uma miniatura tombada, **When** a postura volta para "Em pé", **Then** a miniatura aparece de pé sobre a base de
   novo.
4. **Given** uma miniatura tombada, **When** ela é desenhada, **Then** ela tomba para trás em relação ao lado para onde a
   peça olha (a cabeça para o lado das costas), de modo que a direção da peça continua legível.
5. **Given** uma miniatura tombada dentro da luz, **When** a vista é desenhada, **Then** ela continua projetando sombra e é
   cortada pela borda da luz como as miniaturas em pé.
6. **Given** objetos (peças do tipo objeto), **When** aparecem, **Then** ficam sempre de pé (objetos não têm postura).

---

### User Story 3 — Figuras 2,5D como recortes sobre a base; imagens caídas (Priority: P3)

Tokens sem modelo 3D mas com figura 2,5D também viram miniaturas: a figura em pé (virada para a câmera, como hoje) fica
sobre a **mesma base circular** das miniaturas com modelo, como um recorte de papelão de mesa. Caída ou fora de combate, a
figura **tomba junto com a base**, como a miniatura com modelo. Tokens só com imagem continuam com a imagem no chão, sem
base; caídos, usam a imagem de "Caído" do token quando houver.

**Why this priority**: Completa o visual de mesa e a regra "caído = peça caída" para todos os tokens, mas a maioria das mesas
usa modelos.

**Independent Test**: Um personagem só com figura 2,5D: aparece em pé sobre uma base redonda com a borda azul; caído, figura e
base aparecem tombadas no chão. Um token só com imagem e imagem de "Caído": em pé mostra a imagem normal no chão, caído a de
caído, sem base nos dois casos.

**Acceptance Scenarios**:

1. **Given** um token sem modelo e com figura 2,5D, **When** a peça aparece em pé, **Then** a figura fica de pé sobre uma base
   circular igual à das miniaturas com modelo (mesmo diâmetro pela forma da peça, mesma cor de borda).
2. **Given** um token sem modelo e com figura 2,5D, **When** a peça está caída ou fora de combate, **Then** figura e base
   aparecem tombadas no chão, sobre os hexes da peça, caídas para trás em relação ao lado para onde a peça olha.
3. **Given** um token só com imagem e com imagem de "Caído", **When** a peça está caída ou fora de combate, **Then** o chão
   mostra a imagem de "Caído"; sem ela, a imagem de "Em pé" continua.
4. **Given** um token só com imagem, **When** aparece na isométrica, **Then** não tem base circular.

---

### Edge Cases

- **Modelo que não carrega**: a peça cai para a figura 2,5D (com base) ou a imagem (sem base), como na US3.
- **Postura mudando com a peça fora da luz**: nada aparece; ao entrar na luz a miniatura já aparece na postura atual.
- **Peça caída sobrepondo outra** (a postura nunca é recusada por falta de espaço): as duas aparecem como estão, uma sobre a
  outra, sem tentar evitar o contato.
- **Armas nos encaixes**: continuam presas ao modelo, em pé e tombado (tombam junto).
- **Sombra e luz**: a base também projeta e recebe sombra como o modelo e é cortada pela borda da luz.
- **Hexes coloridos e rastros sob a peça** (103): continuam sob a base, no chão.
- **Balões de fala/ação**: ficam sobre a cabeça da miniatura em pé; tombada, ficam logo acima da miniatura deitada.
- **Tamanho do modelo** ("Tamanho" do token, 25–400%): muda a altura da miniatura, não o tamanho da base (que segue o tamanho
  da peça em hexes).
- **Clique para mudar o foco** (103): continua funcionando numa miniatura em pé ou tombada.
- **Vista 3D atual e 2D**: nada muda — o 3D atual continua animado, sem base, e o caído do 2D continua igual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Na vista isométrica, cada peça cujo token tem modelo 3D MUST aparecer como miniatura: o modelo imóvel, na
  primeira pose da animação de "Parado" do token (ou na pose de repouso, se não houver), **sem tocar nenhuma animação** em
  nenhuma postura.
- **FR-002**: Cada miniatura MUST ficar sobre uma base circular fina apoiada no chão, centrada na peça, com o modelo de pé no
  topo da base.
- **FR-003**: O diâmetro da base MUST acompanhar o tamanho da peça em hexes (1, 2, 3, 7, 10): para 1 hex, cabe dentro do hex;
  para os maiores, cresce na mesma proporção da forma da peça. A escala do modelo ("Tamanho") MUST NOT mudar a base.
- **FR-004**: A base MUST ser escura com a borda na cor da peça no 2D (personagem azul, NPC vermelho, aliado verde-água,
  objeto cinza).
- **FR-005**: Quando a peça está **caída** ou **fora de combate**, a miniatura (modelo, base e armas) MUST aparecer tombada:
  deitada no chão sobre os hexes da peça, caída para trás em relação ao lado para onde a peça olha.
- **FR-005a**: Quando a peça está **fora de combate**, a miniatura tombada (modelo e armas, ou figura 2,5D, ou a imagem no
  chão) MUST aparecer em preto e branco, como no 2D; a base mantém a cor do tipo. Caída, a miniatura mantém as cores.
- **FR-006**: Quando a peça volta a ficar **em pé**, a miniatura MUST voltar a ficar de pé sobre a base.
- **FR-007**: Objetos MUST ficar sempre de pé.
- **FR-008**: Mudanças de postura, posição, direção e token MUST aparecer pelo tempo real sem recarregar a vista.
- **FR-009**: A base e a miniatura tombada MUST seguir as regras de luz da isométrica: cortadas na borda do círculo, escuras
  fora dele, com sombra dentro dele.
- **FR-010**: Tokens sem modelo e com figura 2,5D MUST aparecer como miniatura: a figura em pé sobre a mesma base circular
  (FR-002 a FR-004), tombando junto com a base quando caídos ou fora de combate (FR-005, FR-006).
- **FR-010a**: Tokens só com imagem MUST continuar com a imagem no chão, sem base; caídos ou fora de combate MUST usar a
  imagem de "Caído" quando houver.
- **FR-011**: O 2D e a vista 3D atual MUST NOT mudar.
- **FR-012**: Nenhum dado novo é salvo: a aparência vem do token e da postura que já existem.

### Key Entities

- **Miniatura**: o desenho de uma peça com modelo 3D (o modelo imóvel na pose de "Parado" e as armas) ou com figura 2,5D (o
  recorte virado para a câmera) na isométrica, sobre a base circular; está de pé ou tombada conforme a postura da peça.
- **Base**: disco fino sob a miniatura; diâmetro pelo tamanho da peça em hexes; borda na cor do tipo da peça.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das peças com modelo ou figura 2,5D dentro da luz, a miniatura aparece sobre uma base circular e imóvel (nenhum quadro
  de animação em 10 s de observação).
- **SC-002**: Em uma mesa de teste com 4 personagens, um usuário identifica pela vista isométrica, sem abrir o 2D, quais estão
  caídos ou fora de combate, acertando 100% das vezes.
- **SC-003**: Uma mudança de postura feita por outra pessoa aparece na isométrica em até 2 s, sem recarregar a cena.
- **SC-004**: Em uma mesa de teste com personagem, NPC inimigo, aliado e objeto, o usuário diz o tipo de cada miniatura só pela
  base, acertando todos.
- **SC-005**: A vista isométrica continua fluida com as bases (sem queda perceptível em relação à 103 com o mesmo mapa e
  peças).

## Assumptions

- "Miniatura de mesa" = figura rígida sobre base redonda; por isso a peça caída é a mesma miniatura **tombada** (não a
  animação de "Caído" do token, que a vista 3D atual continua usando).
- "Usa apenas a peça parada" = na isométrica o modelo nunca anima, em nenhuma postura; a primeira pose da animação de
  "Parado" é a pose da miniatura.
- Fora de combate é desenhado tombado como caído e, como no 2D, em preto e branco (a base mantém a cor do tipo, para a peça
  continuar identificável).
- A miniatura tomba para trás em relação ao `look`, para manter legível a direção da peça.
- A base é das peças com modelo 3D e das com figura 2,5D; tokens só com imagem não ganham base.
- Só o frontend muda; nenhuma mudança de API, banco ou MCP.
