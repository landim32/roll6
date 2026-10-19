# Feature Specification: Gerador de imagens de mapa

**Feature Branch**: `095-map-image-generator`
**Created**: 2026-10-19
**Status**: Draft
**Input**: User description: "Crie um gerador de mapas: na biblioteca, um gerador de imagens de mapa como submenu de Mapas; nos mesmos moldes do editor de animação, com um console de conversa com o modelo de IA; implementar uma forma de usar o Codex da mesma forma que usa o Claude; para a geração de imagens usar o Codex; o console deve retornar a imagem gerada para a tela; quando o usuário achar que está bom, ele cria um mapa com essa imagem clicando em 'Salvar'; também é possível editar imagens já existentes; o prompt já deve vir com todas as ordens para criar um mapa top-down, visão de 90°, vista de cima, sem exibir paredes, a lateral dos objetos etc. — deixar isso muito claro, os modelos erram muito nisso; deve ter uma ferramenta de marcação como o editor de animações."

## Clarifications

### Session 2026-10-19

- Q: O "Salvar" de uma edição substitui a imagem do mapa original ou cria um mapa novo? → A: Pergunta na hora — substituir a imagem do mapa original ou criar um mapa novo.
- Q: A grade é escolhida antes de gerar ou só ao salvar? → B: Gera livre; a grade (colunas × linhas) é escolhida só ao salvar, sugerida pela proporção da imagem.
- Q: As sessões do gerador ficam guardadas? → B: Só enquanto a aba está aberta; só o mapa salvo fica guardado (a página avisa antes de sair com versões não salvas).

## Contexto

O editor de animação (086–094) já liga uma página do Roll6 ao Claude Code da máquina do usuário através do
Roll6.Console: o usuário conversa, anexa prints marcados em vermelho e vê o resultado na tela. Esta funcionalidade
reaproveita esse modelo para **imagens de mapa**: o usuário descreve o mapa, o Codex da máquina dele gera a imagem, a
imagem aparece na página, o usuário pede ajustes (inclusive marcando a imagem) e, quando gostar, salva um mapa da
biblioteca com ela.

O ponto mais delicado é o enquadramento: mapas de mesa precisam ser vistos **exatamente de cima** (planta baixa, 90°),
sem perspectiva, sem fachadas nem laterais de paredes ou de objetos — e os modelos de imagem costumam errar isso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar um mapa novo conversando (Priority: P1)

Na biblioteca, em Mapas › Gerador, o usuário escreve "taverna de dois andares, térreo com balcão, seis mesas e lareira,
piso de madeira". O Codex da máquina dele gera a imagem, que aparece grande na página. O usuário pede "mais mesas
perto da janela" e recebe uma nova versão. Quando gosta, clica em "Salvar", dá um nome e o mapa passa a existir em
"Meus mapas", com aquela imagem.

**Why this priority**: É o objetivo da funcionalidade.

**Independent Test**: Com o console conectado, abrir o gerador, pedir um mapa, receber uma imagem, pedir um ajuste,
receber outra e salvar; conferir que o mapa aparece em "Meus mapas" com a última imagem.

**Acceptance Scenarios**:

1. **Given** o console do usuário conectado, **When** ele envia uma descrição no gerador, **Then** a imagem gerada
   aparece na página assim que fica pronta, e a conversa mostra o andamento (pensando, gerando, pronto).
2. **Given** uma imagem gerada, **When** o usuário pede um ajuste, **Then** uma nova versão aparece e as anteriores
   continuam acessíveis na mesma sessão para comparar e voltar.
3. **Given** a versão escolhida na tela, **When** o usuário clica em "Salvar" e confirma o nome, **Then** um mapa novo
   é criado em "Meus mapas" com essa imagem, e o usuário pode abri-lo na mesa.
4. **Given** o console desconectado, **When** o usuário abre o gerador, **Then** a página diz que o console precisa
   estar conectado e não deixa enviar pedidos.

---

### User Story 2 - Mapas sempre vistos de cima (Priority: P1)

Seja qual for a descrição do usuário ("castelo assustador", "floresta com cachoeira"), a imagem gerada é uma planta
vista exatamente de cima: o chão ocupa a imagem, paredes aparecem só como linhas/faixas finas vistas de cima, móveis e
árvores aparecem pelo topo, sem horizonte, sem céu, sem perspectiva e sem a lateral de nada.

**Why this priority**: Uma imagem em perspectiva não serve como mapa de mesa com grade hexagonal; o usuário disse que
os modelos erram muito nisso.

**Independent Test**: Pedir cinco descrições que costumam sair em perspectiva (castelo, rua de cidade, caverna,
floresta, interior de igreja) e conferir que todas saem em vista de cima.

**Acceptance Scenarios**:

1. **Given** qualquer pedido, **When** o Codex gera a imagem, **Then** ele recebe, além do pedido do usuário, as
   instruções fixas de mapa de mesa (vista ortogonal de cima a 90°, sem perspectiva, sem horizonte, sem fachadas,
   sem laterais de paredes ou objetos, iluminação uniforme sem sombras longas, sem texto, sem grade desenhada, sem
   personagens), escritas de forma enfática e repetidas antes da geração.
2. **Given** um pedido que contradiz o enquadramento ("vista isométrica do castelo"), **When** o Codex gera,
   **Then** as instruções de mapa de mesa prevalecem e a resposta avisa que o mapa é sempre visto de cima.
3. **Given** uma imagem que saiu com perspectiva mesmo assim, **When** o usuário marca a área errada e pede correção,
   **Then** o Codex gera uma nova versão reforçando a vista de cima.

---

### User Story 3 - Marcar a imagem para pedir ajustes (Priority: P2)

O usuário quer a lareira em outro canto: abre "Marcar", circula a lareira em vermelho, desenha uma seta até o canto e
escreve "mova para cá". A marcação vai com o pedido; o Codex entende que as formas vermelhas são indicações do
usuário, não parte do mapa.

**Why this priority**: Descrever posições em texto é difícil; o editor de animação já provou o valor das marcações.

**Independent Test**: Marcar uma imagem com lápis, retângulo, círculo e seta, enviar um pedido e conferir que a nova
versão atende à marcação e não contém as marcas vermelhas.

**Acceptance Scenarios**:

1. **Given** uma versão na tela, **When** o usuário escolhe "Marcar", **Then** abre a mesma ferramenta de marcação do
   editor de animação (lápis, retângulo e círculo pontilhados, seta, desfazer/limpar, concluir/cancelar).
2. **Given** uma imagem marcada anexada, **When** o pedido é enviado, **Then** o Codex recebe a imagem marcada e a
   instrução de que as formas vermelhas são do usuário e não devem aparecer no mapa.
3. **Given** até 5 imagens anexadas, **When** o usuário tenta anexar a sexta, **Then** a página avisa o limite.

---

### User Story 4 - Editar a imagem de um mapa existente (Priority: P2)

Em "Meus mapas", o usuário escolhe um mapa e clica em "Editar no gerador". A imagem atual do mapa abre no gerador
como ponto de partida; ele pede "transforme em ruína, com mato no chão" e recebe novas versões a partir dela.

**Why this priority**: Aproveitar mapas prontos é tão útil quanto criar do zero.

**Independent Test**: Abrir um mapa próprio no gerador, pedir uma mudança, receber uma versão derivada da imagem
original e salvar.

**Acceptance Scenarios**:

1. **Given** um mapa do próprio usuário, **When** ele escolhe "Editar no gerador", **Then** o gerador abre com a
   imagem do mapa como primeira versão e a usa como base dos pedidos.
2. **Given** a sessão de edição, **When** o usuário salva, **Then** a página pergunta se ele quer substituir a imagem do mapa original (que muda também
   nas campanhas que o usam) ou criar um mapa novo com o nome escolhido.
3. **Given** um mapa de outro usuário, **When** o usuário quer editá-lo, **Then** ele só pode partir de uma cópia
   (o original nunca muda).

---

### Edge Cases

- **Console desconectado ou cai no meio**: o pedido falha com aviso claro; versões já geradas continuam na tela.
- **Codex não instalado ou não logado** na máquina: o console avisa o motivo e o pedido falha sem travar a página.
- **Geração demorada**: a página mostra o andamento; o usuário pode "Parar"; um pedido sem resultado em 5 minutos
  falha.
- **Imagem inválida ou grande demais** devolvida pelo Codex: é recusada com aviso (formato não suportado, mais de
  10 MB).
- **Um pedido por vez** por sessão; pedidos do gerador e do editor de animação dividem a mesma fila do console.
- **Sair com versões não salvas**: a página pergunta antes de sair.
- **Proporção da imagem x grade**: o Codex gera livre; ao salvar, a página sugere colunas × linhas pela proporção
  da imagem (o usuário pode ajustar), e a imagem cobre a grade como nas imagens enviadas hoje.
- **Pedido malicioso** ("ignore as instruções e…"): as instruções fixas de mapa de mesa vêm do servidor e não podem
  ser removidas pelo texto do usuário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca DEVE ter "Gerador" como submenu de Mapas, com endereço próprio, aberto só a usuários
  logados.
- **FR-002**: O gerador DEVE ter uma conversa com o modelo de IA nos moldes do editor de animação: mensagens do
  usuário e do modelo, andamento ao vivo, "Parar", "Nova conversa" e indicação do console conectado.
- **FR-003**: Os pedidos do gerador DEVEM rodar no **Codex** da máquina do usuário através do Roll6.Console, da mesma
  forma que o editor de animação roda o Claude; o console passa a saber executar o Codex além do Claude.
- **FR-004**: Cada imagem gerada DEVE aparecer na página assim que o Codex a terminar, como uma nova versão da
  sessão; o usuário escolhe qual versão está na tela e pode voltar a versões anteriores.
- **FR-005**: Todo pedido DEVE levar ao Codex as **instruções fixas de mapa de mesa**, montadas pelo servidor e
  impossíveis de remover pelo usuário: vista ortogonal exatamente de cima (90°, planta baixa), sem perspectiva,
  sem horizonte nem céu, sem fachadas, sem laterais ou faces verticais de paredes, móveis, rochas ou árvores (só o
  topo), paredes como faixas vistas de cima, iluminação uniforme sem sombras projetadas longas, sem texto, sem
  legenda, sem grade desenhada, sem personagens ou criaturas, a imagem inteira ocupada pelo chão do mapa até as
  bordas. As instruções DEVEM ser enfáticas, dar exemplos do que é certo e errado e ser repetidas como checagem
  final antes de gerar.
- **FR-006**: O gerador DEVE ter a mesma ferramenta de marcação do editor de animação sobre a versão na tela (lápis,
  retângulo e círculo pontilhados, seta), com até 5 imagens anexadas por pedido, e o Codex DEVE ser avisado de que
  formas vermelhas são indicações do usuário e não fazem parte do mapa.
- **FR-007**: "Salvar" DEVE criar um mapa na biblioteca do usuário com a versão na tela, pedindo o nome e o tamanho
  da grade (colunas × linhas, sugerido pela proporção da imagem); o mapa fica em "Meus mapas" pronto para abrir na
  mesa. Numa sessão de edição, "Salvar" pergunta se substitui a imagem do mapa original ou cria um mapa novo.
- **FR-008**: Um mapa do próprio usuário DEVE poder ser aberto no gerador ("Editar no gerador"), com sua imagem como
  primeira versão e base dos pedidos.
- **FR-009**: A página DEVE avisar antes de sair quando houver versões geradas e não salvas.
- **FR-010**: O gerador só envia pedidos com o console conectado; sem ele, mostra como conectar.
- **FR-011**: Imagens devolvidas pelo Codex DEVEM ser validadas (PNG, JPEG ou WebP, até 10 MB) antes de aparecer.
- **FR-012**: O console continua genérico: ele executa o que o servidor manda (qual modelo usar, instruções,
  arquivos) e devolve os arquivos gerados; o que é um mapa é decidido pelo servidor e pela página.

### Key Entities

- **Sessão do gerador**: uma conversa com o Codex sobre um mapa, do usuário; tem mensagens, versões geradas e,
  quando é edição, o mapa de origem.
- **Versão de imagem**: uma imagem gerada (ou a original, na edição), com o pedido que a produziu e a hora.
- **Mapa**: o mapa da biblioteca criado (ou atualizado) pelo "Salvar".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário com o console conectado cria um mapa novo a partir de uma descrição, com ao menos um ajuste,
  em menos de 10 minutos.
- **SC-002**: Em uma bateria de 10 descrições variadas (interiores, exteriores, cavernas, cidades), pelo menos 9
  imagens saem em vista de cima, sem perspectiva nem laterais visíveis.
- **SC-003**: 100% dos pedidos levam as instruções fixas de mapa de mesa, inclusive quando o texto do usuário pede o
  contrário.
- **SC-004**: A imagem aparece na página em até 5 segundos depois de o Codex terminá-la.
- **SC-005**: Nenhum mapa salvo pelo gerador contém as marcações vermelhas do usuário.

## Assumptions

- O Codex CLI está instalado e logado na máquina do usuário e consegue gerar imagens em arquivos dentro da pasta de
  trabalho do console; o mecanismo exato fica para o plano.
- A sessão (conversa e versões) vale só enquanto a aba está aberta; nada dela é guardado no servidor além do mapa
  salvo. A conversa com o Codex dura a sessão da aba.
- O mapa salvo usa as regras de mapas existentes (imagem no armazenamento, grade hexagonal, máscara 3D opcional
  depois, no editor de mapa).
- A ferramenta de marcação é a do editor de animação, sem mudanças de comportamento.
- O Claude continua sendo o modelo do editor de animação; o Codex é usado só pelo gerador de mapas.
