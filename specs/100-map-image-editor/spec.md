# Feature Specification: Editor de imagem no gerador de mapas

**Feature Branch**: `100-map-image-editor`
**Created**: 2026-10-22
**Status**: Draft
**Input**: User description: "Na geração de mapa, crie uma ferramenta de edição, onde posso cortar, rotacionar e pintar (brush) partes do mapa antes de salvar, criando uma nova versão"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pintar à mão uma parte do mapa (Priority: P1)

No Gerador de mapas, a versão na tela tem um detalhe errado que não vale um novo pedido ao Codex: uma mancha, uma porta
no lugar errado, um pedaço de chão de outra cor. O usuário abre **"Editar"** sobre a versão, escolhe o **pincel**, a cor
(ou pega uma cor do próprio mapa com o conta-gotas) e o tamanho, e pinta por cima. Ao **aplicar**, a imagem editada vira
uma **nova versão** na faixa de versões — a original continua lá — e pode ser salva como mapa, usada como base do
próximo pedido ao Codex ou editada de novo.

**Why this priority**: é a correção mais comum e a que nenhum pedido ao Codex resolve com precisão.

**Independent Test**: com uma versão na tela, abrir o editor, pintar uma área de uma cor tirada do mapa, aplicar → a
faixa ganha a versão seguinte com a pintura, a anterior fica intacta, e "Salvar" grava a editada.

**Acceptance Scenarios**:

1. **Given** uma versão selecionada e nenhum pedido em andamento, **When** o usuário clica "Editar", **Then** abre o
   editor com essa imagem em tamanho de trabalho, com as ferramentas pincel, cortar e girar.
2. **Given** o pincel, **When** o usuário escolhe cor, tamanho e opacidade e arrasta sobre a imagem, **Then** a tinta
   aparece no traço; o conta-gotas pega a cor de um ponto da imagem.
3. **Given** o pincel de clonagem, **When** o usuário marca a origem (Alt+clique, ou "Origem" + toque) e pinta em outro
   lugar, **Then** o traço copia o mapa a partir da origem com o mesmo deslocamento, mostrando onde a origem está; sem
   origem marcada, o pincel de clonagem avisa e não pinta.
4. **Given** edições feitas, **When** o usuário usa Desfazer/Refazer, **Then** cada traço, corte ou giro volta ou
   reaparece na ordem.
5. **Given** edições feitas, **When** "Aplicar", **Then** a imagem resultante entra como **nova versão** (número
   seguinte), selecionada, e a versão de partida não muda.
6. **Given** edições feitas, **When** "Cancelar" (ou Esc), **Then** o editor pergunta antes de descartar e nada muda.

---

### User Story 2 - Cortar o mapa (Priority: P1)

O Codex desenhou bordas vazias ou um pedaço que não interessa. O usuário escolhe **cortar**, ajusta um retângulo sobre a
imagem (arrastando os cantos/bordas, com a proporção livre ou travada), confirma, e o resultado fica só com a parte
escolhida.

**Why this priority**: mapa com sobra muda a grade sugerida e o enquadramento na mesa.

**Independent Test**: cortar uma versão para um retângulo menor e aplicar → a nova versão tem exatamente o tamanho e o
conteúdo do retângulo; a grade sugerida ao salvar é recalculada a partir dela.

**Acceptance Scenarios**:

1. **Given** a ferramenta cortar, **When** abre, **Then** um retângulo cobrindo a imagem inteira aparece, com alças
   nos cantos e bordas e as dimensões em pixels.
2. **Given** o retângulo ajustado, **When** o usuário confirma o corte, **Then** a área de trabalho passa a ser só o
   retângulo (e pode-se continuar pintando ou girando).
3. **Given** um retângulo menor que 64 × 64 px, **When** confirma, **Then** o corte é recusado com uma mensagem.

---

### User Story 3 - Girar o mapa (Priority: P2)

O mapa saiu de lado ou o usuário quer o corredor na horizontal. Ele gira a imagem 90° para a direita ou a esquerda,
ou a espelha na horizontal ou na vertical, e aplica (Q1 = A).

**Why this priority**: útil, mas menos frequente que pintar e cortar.

**Independent Test**: girar 90° à direita e aplicar → a nova versão tem largura e altura trocadas e o conteúdo girado.

**Acceptance Scenarios**:

1. **Given** a ferramenta girar, **When** o usuário gira 90° ou espelha, **Then** a imagem na tela gira/espelha e as
   dimensões mostradas acompanham.
2. **Given** um giro, **When** aplicado, **Then** a nova versão sai girada, sem cortar nenhum pedaço do mapa.

---

### Edge Cases

- **Pedido ao Codex em andamento**: o editor não abre (o botão fica desabilitado com o motivo); uma imagem que chegar
  enquanto o editor estiver aberto entra na faixa normalmente, sem atrapalhar a edição.
- **Imagem muito grande** (ex.: 4096 px): a edição trabalha na resolução original; a tela mostra uma versão reduzida
  com zoom e arraste.
- **Nada mudou**: "Aplicar" sem nenhuma edição não cria versão.
- **Transparência**: áreas transparentes da imagem continuam transparentes, exceto onde forem pintadas.
- **Versão 0** (a imagem do mapa que se está editando no gerador): também pode ser editada; o resultado é uma versão
  nova, e "Substituir a imagem de …" passa a usá-la.
- **Sair da página** com o editor aberto e edições não aplicadas: a mesma confirmação de saída da página.
- **Celular**: pincel e corte funcionam com o dedo; o desfazer fica sempre visível.
- **Marcar print** (anotações vermelhas para o Codex) continua sendo outra coisa: marcações vão ao Codex como anexo;
  edições mudam a imagem.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O gerador MUST oferecer "Editar" sobre a versão selecionada, desabilitado enquanto um pedido ao Codex
  estiver em andamento.
- **FR-002**: O editor MUST ter as ferramentas **pincel** (cor, tamanho 1–200 px, opacidade, conta-gotas), **pincel de
  clonagem** (origem marcada por Alt+clique ou pelo botão "Origem" + toque; copia a partir da origem com o deslocamento
  do primeiro traço, mesmo tamanho e opacidade; Q2 = B), **cortar** (retângulo ajustável, proporção livre ou travada,
  mínimo 64 × 64 px) e **girar** (90° à direita/esquerda e espelhar na horizontal/vertical; Q1 = A).
- **FR-003**: O editor MUST ter Desfazer/Refazer de cada operação (pelo menos as últimas 50), e atalhos Ctrl+Z / Ctrl+Y
  fora de campos de texto.
- **FR-004**: "Aplicar" MUST criar uma **nova versão** com a imagem editada, na resolução real do resultado, e
  selecioná-la; a versão de partida MUST permanecer inalterada. Sem edições, nada é criado.
- **FR-005**: "Cancelar"/Esc com edições MUST pedir confirmação antes de descartar.
- **FR-006**: Uma versão editada MUST poder ser salva como mapa (com a grade sugerida recalculada pelo novo tamanho),
  usada para substituir a imagem do mapa em edição, usada como base do próximo pedido ao Codex e editada de novo.
- **FR-007**: A faixa de versões MUST indicar que uma versão veio do editor (ex.: "editada a partir da 3").
- **FR-008**: A edição MUST acontecer inteiramente no navegador: nada é enviado ao servidor nem ao Codex até o usuário
  salvar ou mandar um pedido.
- **FR-009**: O editor MUST funcionar com mouse e com toque.

### Key Entities *(include if feature involves data)*

- **Versão (existente)**: ganha a origem "editada a partir da versão N" quando vem do editor.
- **Edição**: a sequência de operações (traços de pincel, corte, giro) sobre uma imagem de partida, com histórico para
  desfazer; vive só enquanto o editor está aberto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Corrigir uma área pequena do mapa (pintar e aplicar) leva menos de 30 segundos, sem pedido ao Codex.
- **SC-002**: Em 100% dos casos, aplicar uma edição cria exatamente uma versão nova e deixa a de partida intacta.
- **SC-003**: Uma imagem cortada para W × H e girada sai com exatamente as dimensões esperadas (W × H, ou H × W após
  um giro de 90°; espelhar não muda as dimensões).
- **SC-004**: O traço do pincel acompanha o dedo/mouse sem atraso perceptível numa imagem de 2048 px.
- **SC-005**: Desfazer volta exatamente ao estado anterior em 100% das operações.

## Assumptions

- O editor vive só na página do Gerador de mapas (Biblioteca › Mapas › Gerador); não edita mapas salvos fora dele (para
  isso abre-se o mapa no gerador, o que já é possível).
- "Cortar" é **recortar** (ficar só com um retângulo); apagar um pedaço é pintar por cima.
- Pincéis com borda suave (cor sólida e clonagem); não há camadas, texto nem formas.
- A nova versão vive na aba como as do Codex (095: nada é guardado no servidor até salvar).

## Clarifications

### Session 2026-10-22

- Q1: Girar → **A**: só em passos de 90° (direita/esquerda) e espelhar na horizontal ou na vertical; nada da imagem se
  perde e a grade continua alinhada.
- Q2: Pincel → **B**: cor sólida **e** pincel de clonagem — Alt+clique (ou, no toque, o botão "Origem" e um toque)
  marca o ponto de origem; os traços seguintes copiam o mapa a partir daí, com o mesmo deslocamento.
