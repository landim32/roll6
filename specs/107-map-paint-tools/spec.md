# Feature Specification: Modo "Editar mapa" e pintura do mapa da campanha

**Feature Branch**: `107-map-paint-tools`
**Created**: 2026-11-03
**Status**: Draft
**Input**: User description: "Melhorias no Mapa: Na barra do zoom incluir um botão \"Editar mapa\"; As ferramentas \"Imagem\" e \"Ajustar Imagem\" só ficam visiveis quando entra no modo de edição de imagem; Apenas no 2D passa a existir um modo \"Pintar\"; Ao clicar nesse botão abre outra lista de botões ao lado esquerdo desse; São ferramentas de pintura do mapa, elas pintam o mapa, mas apenas nessa instancia, apenas o mapa usado naquela campanha. As ferramentas são: Preencher (marca um hex com algo — parede, pedra, buraco, água, fogo, entrada e marcação (um x vermelho no mapa); na API esses hex ficam marcados com essa informação, opções em um enum; quando for marcação pode colocar um texto no hex), Quadrado (escolhe a cor), Circunferência (escolhe a cor), Lápis (igual editor de imagem), Linha (igual editor de imagem), Seta (mesmo padrão). Crie um endpoint que retorna o conteúdo de um hex."

## Contexto

Hoje a barra de controles do mapa (zoom, compartilhar, vista) mostra sempre os botões "Imagem" e "Ajustar imagem",
que só interessam a quem prepara o mapa e poluem a barra durante o jogo. Além disso, o mestre não tem como anotar o
mapa **durante a campanha**: marcar uma parede que a imagem não mostra, um buraco aberto, fogo se espalhando, a entrada
de uma sala, ou desenhar uma área de efeito, uma rota ou uma seta. Hoje isso só se faz mudando a imagem do modelo de
mapa, o que vale para todas as campanhas que usam esse modelo.

Esta funcionalidade:

1. Agrupa as ferramentas de edição atrás de um botão **"Editar mapa"** na barra do zoom.
2. Cria, só no 2D, o modo **"Pintar"**, com ferramentas que desenham sobre o mapa **daquela campanha** (a instância do
   mapa), sem tocar no modelo nem na imagem.
3. Guarda no servidor a marcação de cada hex (tipo + texto da marcação) e oferece uma consulta do **conteúdo de um
   hex**, útil para o mestre, para o Claude do mestre (Modo GM / Perguntar) e para integrações.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Botão "Editar mapa" esconde as ferramentas de imagem (Priority: P1)

Quem pode editar o mapa vê na barra do zoom um botão "Editar mapa". Fora do modo de edição a barra mostra só o que
serve ao jogo (zoom, compartilhar, vista). Ao ligar "Editar mapa", aparecem os botões "Imagem" e "Ajustar imagem" e,
no 2D, o botão "Pintar". Desligar o modo esconde tudo de novo e encerra qualquer ajuste ou pintura em andamento.

**Why this priority**: É a base de toda a funcionalidade (onde ficam as ferramentas) e já limpa a barra para quem joga.

**Independent Test**: Abrir um mapa como mestre, conferir que "Imagem"/"Ajustar imagem" não aparecem; ligar "Editar
mapa" e conferir que aparecem e funcionam como hoje; desligar e conferir que somem e que o modo de ajuste foi encerrado.

**Acceptance Scenarios**:

1. **Given** um mapa aberto por quem pode editá-lo, **When** a barra é exibida, **Then** aparece o botão "Editar mapa"
   e não aparecem "Imagem" nem "Ajustar imagem".
2. **Given** o modo "Editar mapa" ligado, **When** o usuário olha a barra, **Then** "Imagem" e "Ajustar imagem" aparecem
   com o mesmo comportamento de hoje, e o botão "Editar mapa" aparece como ativo.
3. **Given** "Ajustar imagem" ativo, **When** o usuário desliga "Editar mapa", **Then** o ajuste é encerrado e os botões
   somem.
4. **Given** um usuário que não pode editar o mapa (jogador, campanha pausada/finalizada), **When** a barra é exibida,
   **Then** o botão "Editar mapa" não aparece.
5. **Given** a vista isométrica ou 3D, **When** "Editar mapa" está ligado, **Then** o botão "Pintar" não aparece (só
   existe no 2D).

---

### User Story 2 - Preencher hexes com terreno e marcações (Priority: P1)

No modo "Pintar" do mapa de uma campanha, o mestre escolhe a ferramenta **Preencher** e um tipo — Parede, Pedra,
Buraco, Água, Fogo, Entrada ou Marcação — e clica (ou arrasta) sobre hexes para marcá-los. Cada tipo tem sua própria
imagem desenhada dentro do hex; Marcação é um X vermelho e pode receber um texto curto. Todos os participantes veem as
marcações no 2D, em tempo real, e elas ficam guardadas no servidor por hex.

**Why this priority**: É o pedido central com valor de jogo (terreno e pontos de interesse que todos veem e que o
servidor conhece) e a base da consulta do conteúdo do hex.

**Independent Test**: Como mestre, marcar três hexes (Parede, Água, Marcação com texto "Baú"), recarregar a página e
ver as marcações; um jogador conectado vê as marcações aparecerem sem recarregar.

**Acceptance Scenarios**:

1. **Given** o modo Pintar com Preencher = Água, **When** o mestre clica num hex, **Then** o hex passa a mostrar a imagem
   de água e a marcação é salva.
2. **Given** Preencher ativo, **When** o mestre arrasta o ponteiro sobre vários hexes, **Then** cada hex percorrido
   recebe o tipo escolhido.
3. **Given** Preencher = Marcação, **When** o mestre marca um hex, **Then** o hex mostra um X vermelho e o mestre pode
   informar um texto (opcional) que aparece junto ao X.
4. **Given** um hex já marcado com Fogo, **When** o mestre o preenche com Pedra, **Then** ele passa a ser Pedra (um hex
   tem no máximo um tipo).
5. **Given** a ferramenta Borracha de hex (ou Preencher = "Nenhum"), **When** o mestre clica num hex marcado, **Then**
   a marcação (e seu texto) é removida.
6. **Given** um hex fora da grid, **When** o mestre clica nele, **Then** nada é marcado.
7. **Given** um jogador aprovado com o mapa aberto, **When** o mestre marca hexes, **Then** o jogador vê as marcações
   sem recarregar.
8. **Given** duas campanhas usando o mesmo modelo de mapa, **When** o mestre marca hexes no mapa da campanha A,
   **Then** o mapa da campanha B continua sem marcações.

---

### User Story 3 - Consultar o conteúdo de um hex (Priority: P2)

Um cliente (o site, o Claude do mestre pelo MCP ou uma integração) consulta um hex de um mapa de campanha e recebe o
que há nele: a coordenada, se está dentro da grid, a marcação (tipo e texto) e as peças que o ocupam (nome, tipo de
peça e, quando houver, personagem/NPC e postura).

**Why this priority**: Dá ao servidor e ao Claude do mestre uma forma direta de saber "o que há aqui" sem montar isso a
partir de várias listas; depende das marcações (US2) para ter valor completo.

**Independent Test**: Marcar um hex com Parede e pôr uma peça noutro; consultar os dois e um hex vazio e conferir as
três respostas; consultar um hex fora da grid e receber erro de validação.

**Acceptance Scenarios**:

1. **Given** um hex marcado como Marcação com texto "Baú", **When** o conteúdo do hex é consultado, **Then** a resposta
   traz o tipo Marcação e o texto "Baú".
2. **Given** um hex coberto por uma peça de tamanho 3 (cujo centro está noutro hex), **When** o hex é consultado,
   **Then** a peça aparece na resposta.
3. **Given** um hex vazio dentro da grid, **When** é consultado, **Then** a resposta traz a coordenada sem marcação e
   sem peças.
4. **Given** um hex fora da grid, **When** é consultado, **Then** a resposta é um erro de validação.
5. **Given** um usuário que não é o mestre nem participante aprovado, **When** consulta o hex, **Then** o acesso é negado.

---

### User Story 4 - Desenhar formas, traços e setas (Priority: P2)

No modo Pintar, além de Preencher, o mestre tem as ferramentas **Quadrado**, **Circunferência**, **Lápis**, **Linha** e
**Seta**, cada uma com escolha de cor (e, como no editor de imagem, espessura e opacidade). Quadrado e circunferência
são desenhados arrastando de um ponto a outro; lápis é traço livre; linha e seta vão de um ponto a outro, a seta com
ponta no ponto final. Os desenhos ficam sobre a imagem do mapa e sob as peças, valem só para aquele mapa da campanha e
todos os participantes os veem.

**Why this priority**: Enriquece a narração (áreas de efeito, rotas, indicações), mas o jogo funciona sem isso.

**Independent Test**: Desenhar um quadrado vermelho, uma circunferência azul, um traço de lápis, uma linha e uma seta;
recarregar e ver os cinco desenhos nas mesmas posições e cores; um jogador os vê em tempo real.

**Acceptance Scenarios**:

1. **Given** a ferramenta Quadrado com a cor vermelha, **When** o mestre arrasta de um ponto a outro, **Then** surge um
   quadrado (retângulo) vermelho com cantos nesses pontos e ele é salvo.
2. **Given** a ferramenta Circunferência, **When** o mestre arrasta do centro até um ponto, **Then** surge uma
   circunferência com aquele centro e raio, na cor escolhida.
3. **Given** a ferramenta Lápis, **When** o mestre desenha à mão livre, **Then** o traço segue o ponteiro com a cor,
   espessura e opacidade escolhidas.
4. **Given** a ferramenta Linha ou Seta, **When** o mestre arrasta de A até B, **Then** surge uma linha reta de A a B
   (na seta, com ponta em B).
5. **Given** um desenho em andamento, **When** o mestre aperta Esc ou clica com o botão direito, **Then** o desenho é
   descartado sem salvar.
6. **Given** a ferramenta Apagar desenho, **When** o mestre clica sobre um desenho, **Then** esse desenho é removido.
7. **Given** desenhos no mapa, **When** o mestre usa "Limpar pintura" e confirma, **Then** todos os desenhos e marcações
   daquele mapa da campanha são removidos.

---

### User Story 5 - Barra de ferramentas de pintura ao lado do botão (Priority: P3)

Ao ligar "Pintar", abre-se uma segunda lista de botões à esquerda do botão, com as ferramentas (Preencher, Quadrado,
Circunferência, Lápis, Linha, Seta, Apagar) e as opções da ferramenta escolhida (tipo de preenchimento, cor, espessura,
opacidade). Enquanto o modo Pintar está ligado, cliques no mapa pintam em vez de abrir o menu do hex; desligar Pintar
(ou "Editar mapa") volta ao comportamento normal.

**Why this priority**: É a forma de acesso às ferramentas; separada para poder ser ajustada sem mudar o que é pintado.

**Independent Test**: Ligar Pintar e ver a lista à esquerda; trocar de ferramenta e ver as opções mudarem; desligar e
conferir que o clique num hex volta a abrir o menu do hex.

**Acceptance Scenarios**:

1. **Given** "Editar mapa" ligado no 2D de um mapa de campanha, **When** o mestre clica em "Pintar", **Then** abre à
   esquerda dele a lista de ferramentas e o botão fica ativo.
2. **Given** Pintar ligado, **When** o mestre clica num hex, **Then** a ferramenta atual age e o menu do hex não abre.
3. **Given** Pintar ligado, **When** o mestre troca para a vista isométrica/3D ou desliga "Editar mapa", **Then** o
   modo Pintar é desligado.
4. **Given** um mapa aberto que não pertence a uma campanha (modelo solto), **When** "Editar mapa" está ligado,
   **Then** "Pintar" aparece desabilitado com a explicação de que a pintura vale só para mapas de campanha.

---

### Edge Cases

- Mapa arquivado ou campanha pausada/finalizada: a pintura segue a mesma regra de edição do mapa da campanha
  (permitida em campanha ativa e, para o mestre, em preparação); fora disso "Editar mapa" não aparece e o servidor recusa.
- Mudança do tamanho da grid do modelo: marcações em hexes que ficaram fora da grid deixam de ser mostradas e não
  aparecem na consulta, mas não são apagadas (voltam se a grid crescer).
- Ajuste da imagem (deslocamento/escala): desenhos e marcações acompanham a grid (as coordenadas são do mapa, não da
  imagem).
- Mapa excluído: suas marcações e desenhos são removidos junto; campanha excluída idem.
- Dois mestres não existem, mas a mesma pessoa pode pintar em duas abas: a última gravação de cada hex vence; desenhos
  são independentes entre si.
- Texto da marcação longo ou vazio: limitado a um tamanho curto (até 100 caracteres); vazio = só o X.
- Muitos desenhos: há um limite por mapa (até 500 desenhos e traços de lápis com no máximo 2.000 pontos), acima disso o
  servidor recusa com mensagem clara.
- Peça sobre um hex marcado: a peça continua desenhada por cima da marcação; a marcação continua visível ao redor.
- Telefone: "Editar mapa" segue a regra atual das ferramentas de imagem (não aparece em telas pequenas); a pintura é
  vista por todos em qualquer tela.
- Compartilhar o mapa (imagem JPEG): inclui marcações e desenhos, como o 2D os mostra.

## Requirements *(mandatory)*

### Functional Requirements

**Barra do mapa**

- **FR-001**: A barra do zoom MUST oferecer o botão "Editar mapa" a quem pode editar o mapa aberto, em qualquer vista.
- **FR-002**: Os botões "Imagem" e "Ajustar imagem" MUST aparecer somente com "Editar mapa" ligado, mantendo o
  comportamento atual.
- **FR-003**: O botão "Pintar" MUST aparecer somente com "Editar mapa" ligado e somente na vista 2D.
- **FR-004**: Desligar "Editar mapa", trocar de vista, trocar de mapa ou perder a permissão de edição MUST encerrar o
  ajuste da imagem e o modo Pintar.
- **FR-005**: Ao ligar "Pintar", MUST abrir uma lista de ferramentas à esquerda do botão, com as opções da ferramenta
  escolhida.

**Pintura (instância do mapa da campanha)**

- **FR-006**: A pintura MUST pertencer ao mapa da campanha (instância), nunca ao modelo de mapa nem à imagem; outros
  mapas e campanhas que usam o mesmo modelo MUST permanecer inalterados.
- **FR-007**: Somente o mestre da campanha MUST poder pintar, apagar e limpar; mestre e participantes aprovados MUST
  ver a pintura.
- **FR-008**: A pintura MUST seguir a regra de edição do mapa da campanha (campanha ativa, ou em preparação para o
  mestre); fora disso o servidor MUST recusar.
- **FR-009**: Enquanto o modo Pintar está ligado, cliques e arrastos no mapa MUST acionar a ferramenta atual em vez do
  menu do hex, de "Mover" ou de soltar cartas.
- **FR-010**: Esc ou clique com o botão direito MUST descartar o desenho em andamento.
- **FR-011**: Toda alteração de pintura MUST ser salva no servidor e aparecer em tempo real para os demais que estão com
  o mapa aberto.

**Preencher**

- **FR-012**: A ferramenta Preencher MUST marcar hexes inteiros com um dos tipos: Parede, Pedra, Buraco, Água, Fogo,
  Entrada, Marcação — uma lista fixa de valores conhecida pelo servidor.
- **FR-013**: Cada tipo MUST ter uma imagem própria desenhada dentro do hex; Marcação MUST ser um X vermelho.
- **FR-014**: Um hex MUST ter no máximo uma marcação; preencher um hex marcado substitui a marcação.
- **FR-015**: Marcação MUST aceitar um texto opcional de até 100 caracteres, mostrado junto ao X; os demais tipos não
  têm texto.
- **FR-016**: O usuário MUST poder remover a marcação de um hex.
- **FR-017**: Hexes fora da grid MUST ser recusados.

**Desenhos**

- **FR-018**: As ferramentas Quadrado, Circunferência, Lápis, Linha e Seta MUST criar desenhos com cor escolhida pelo
  usuário, além de espessura e opacidade como no editor de imagem.
- **FR-019**: Quadrado MUST ser definido por dois cantos; Circunferência por centro e raio; Linha e Seta por ponto
  inicial e final (Seta com ponta no final); Lápis por uma sequência de pontos.
- **FR-020**: Os desenhos MUST ser posicionados em coordenadas do mapa, desenhados sobre a imagem e a grid e sob as
  peças e balões.
- **FR-021**: O usuário MUST poder apagar um desenho individualmente e limpar toda a pintura do mapa (com confirmação).
- **FR-022**: O servidor MUST limitar a quantidade de desenhos por mapa e de pontos por traço, recusando o excesso com
  mensagem clara.

**Conteúdo do hex**

- **FR-023**: O sistema MUST oferecer uma consulta do conteúdo de um hex de um mapa de campanha, por coluna/linha,
  retornando: coordenada, se está dentro da grid, a marcação (tipo e texto, se houver) e as peças cuja forma cobre o hex
  (identificação, nome, tipo de peça, personagem ou NPC ligado e postura).
- **FR-024**: A consulta MUST estar disponível ao mestre e aos participantes aprovados; demais usuários MUST ser
  recusados; hex fora da grid MUST retornar erro de validação.
- **FR-025**: A consulta do conteúdo do hex e as operações de pintura MUST estar disponíveis também pelas ferramentas do
  Claude do mestre (MCP), como todo recurso da API.

**Outros**

- **FR-026**: A imagem compartilhada do mapa MUST incluir as marcações e os desenhos como aparecem no 2D.
- **FR-027**: Excluir um mapa ou uma campanha MUST remover a pintura correspondente.

### Key Entities

- **Marcação de hex**: pertence a um mapa da campanha; coluna, linha, tipo (Parede, Pedra, Buraco, Água, Fogo, Entrada,
  Marcação), texto opcional (só Marcação), autor e data. No máximo uma por hex.
- **Desenho do mapa**: pertence a um mapa da campanha; tipo (Quadrado, Circunferência, Lápis, Linha, Seta), pontos em
  coordenadas do mapa, cor, espessura, opacidade, autor e data.
- **Conteúdo do hex** (consulta, não guardado): coordenada, dentro/fora da grid, marcação e peças que cobrem o hex.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Fora do modo de edição, a barra do mapa tem pelo menos 2 botões a menos para o mestre, e nenhum botão de
  edição para os jogadores.
- **SC-002**: O mestre marca 10 hexes com terreno em menos de 30 segundos.
- **SC-003**: Uma marcação ou desenho feito pelo mestre aparece para os jogadores conectados em até 2 segundos.
- **SC-004**: Após recarregar a página, 100% das marcações e desenhos reaparecem na mesma posição, cor e tipo.
- **SC-005**: Pintar o mapa de uma campanha não altera nenhum outro mapa que use o mesmo modelo (0 vazamentos nos
  testes).
- **SC-006**: A consulta do conteúdo do hex responde corretamente (marcação e peças, incluindo peças grandes que cobrem
  o hex) em 100% dos casos de teste.

## Assumptions

- As marcações de hex são **visuais e informativas** nesta funcionalidade: Parede, Buraco, Água etc. **não** bloqueiam
  movimento, não alteram o custo de Deslocamento nem a colocação de peças. Regras de terreno podem ser uma funcionalidade
  futura que lê essas marcações.
- Só o mestre pinta (o mesmo que hoje controla o mapa da campanha); jogadores e aliados comandados apenas veem.
- Um modelo de mapa aberto fora de uma campanha não tem instância e, portanto, não pode ser pintado.
- "Igual editor de imagem" significa as mesmas opções do pincel do editor de imagem do gerador de mapas: cor,
  espessura e opacidade. Não há conta-gotas, clonar, recortar nem desfazer/refazer em lote nesta funcionalidade; a
  correção é feita apagando o desenho ou a marcação.
- Quadrado e circunferência são contornos (sem preenchimento); o quadrado aceita lados diferentes (retângulo alinhado à
  tela do mapa).
- As imagens dos tipos de preenchimento são desenhos próprios simples do Roll6 (vetoriais), na paleta do tema, sem
  dependência de imagens externas.
- A pintura não aparece na vista isométrica nem no 3D legado nesta funcionalidade (só no 2D e na imagem compartilhada).
- Pintar não gera registro no turno nem notificação push; apenas o evento de tempo real para quem está com o mapa aberto.
- A pintura não entra no "salvar mapa" do editor (não deixa o mapa "sujo"): cada ação é salva na hora.
