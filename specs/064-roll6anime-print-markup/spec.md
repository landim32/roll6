> **Superseded by 086-web-animation-editor** (2026-10-18): the Windows tool `roll6anime/` was removed; its capabilities live in the web editor (`/animation/:id`) and the generic console `backend/Roll6.Console`. Kept as history.

# Feature Specification: Marcações no print do roll6anime

**Feature Branch**: `064-roll6anime-print-markup`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "No roll6anime, crie uma editor de imagem para o print, com as ferramentes de lapis, quadrado pontilhado, circuferencia pontilhada e seta, tudo em vermelho, apenas para apontar informações para o modelo de IA"

## Clarifications

### Session 2026-10-14

- Q: Quando o editor abre? → A: sozinho, logo depois de "Anexar print"; Concluir anexa (marcado ou não), Cancelar desiste do print; a miniatura reabre o editor.

## Contexto

O roll6anime já anexa ao pedido um print da vista 3D (pose e câmera atuais), que o Claude recebe como imagem com uma
legenda. Para pedidos como "este cotovelo está torto" ou "a mão deveria ficar aqui", o usuário precisa **apontar** na
imagem. Esta funcionalidade acrescenta um editor simples de marcações sobre o print: lápis, retângulo pontilhado,
circunferência pontilhada e seta, sempre em vermelho. Não é um editor de imagem completo: serve só para mostrar ao
Claude onde olhar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marcar o print antes de enviar (Priority: P1)

O usuário anexa um print, abre o editor, circula o cotovelo esquerdo com a circunferência pontilhada, desenha uma
seta indicando para onde a mão deve ir e confirma. A miniatura do anexo passa a mostrar as marcações, e o Claude recebe
a imagem marcada.

**Why this priority**: é o pedido inteiro; sem isso não há como apontar nada.

**Independent Test**: anexar um print, desenhar uma marcação de cada ferramenta, confirmar, ver as marcações na
miniatura e enviar um pedido perguntando ao Claude o que está marcado.

**Acceptance Scenarios**:

1. **Given** um modelo aberto, **When** o usuário clica em "Anexar print", **Then** o editor abre com o print grande, as quatro ferramentas
   (Lápis, Retângulo, Circunferência, Seta) com uma delas selecionada, e os botões Desfazer, Limpar, Cancelar e
   Concluir.
2. **Given** a ferramenta Lápis, **When** o usuário arrasta sobre a imagem, **Then** aparece um traço vermelho contínuo
   seguindo o ponteiro.
3. **Given** a ferramenta Retângulo, **When** o usuário arrasta de um canto ao outro, **Then** aparece um retângulo de
   contorno vermelho pontilhado entre os dois pontos, atualizado enquanto arrasta.
4. **Given** a ferramenta Circunferência, **When** o usuário arrasta, **Then** aparece uma elipse de contorno vermelho
   pontilhado inscrita no retângulo arrastado (com o retângulo quadrado, uma circunferência).
5. **Given** a ferramenta Seta, **When** o usuário arrasta do ponto A ao ponto B, **Then** aparece uma linha vermelha
   de A até B com a ponta da seta em B.
6. **Given** marcações feitas, **When** o usuário clica em Concluir, **Then** o anexo passa a ser a imagem com as
   marcações, a miniatura as mostra e é essa imagem que vai ao Claude no próximo pedido.
7. **Given** o editor aberto logo depois de "Anexar print", **When** o usuário clica em Cancelar (ou fecha a janela),
   **Then** o print não é anexado.
8. **Given** o editor reaberto pela miniatura de um anexo, **When** o usuário cancela, **Then** o anexo fica como
   estava antes de abrir o editor.
9. **Given** o editor aberto logo depois de "Anexar print", **When** o usuário clica em Concluir sem marcar nada,
   **Then** o print é anexado como hoje.

---

### User Story 2 - Corrigir marcações (Priority: P2)

O usuário erra uma marcação e a desfaz, ou apaga todas e recomeça; ao reabrir um print já marcado, pode continuar
marcando ou remover as marcações anteriores.

**Why this priority**: sem desfazer, um traço errado obriga a capturar o print de novo.

**Independent Test**: fazer três marcações, Desfazer duas vezes (fica uma), Limpar (nenhuma), Concluir; reabrir o
editor e ver as marcações da última conclusão, ainda editáveis.

**Acceptance Scenarios**:

1. **Given** três marcações, **When** o usuário clica em Desfazer, **Then** a última desaparece; repetindo, as outras
   na ordem inversa.
2. **Given** marcações, **When** o usuário clica em Limpar, **Then** todas desaparecem (e Desfazer as traz de volta).
3. **Given** um print já marcado e concluído, **When** o usuário reabre o editor, **Then** vê as marcações anteriores
   e pode desfazê-las, apagá-las ou acrescentar outras; o print original, sem marcações, nunca se perde.

---

### User Story 3 - O Claude entende que são marcações (Priority: P2)

A legenda do print diz que as formas vermelhas foram desenhadas pelo usuário para apontar partes da imagem, para o
Claude não as tomar como parte do modelo 3D.

**Why this priority**: sem isso o Claude pode descrever "um círculo vermelho no chão".

**Independent Test**: enviar um print marcado e perguntar o que está marcado; o Claude se refere à parte apontada, não
às formas como objetos da cena.

**Acceptance Scenarios**:

1. **Given** um print com marcações, **When** ele é enviado, **Then** a legenda da imagem informa que tem marcações
   vermelhas do usuário (e de que tipos).
2. **Given** um print sem marcações, **When** ele é enviado, **Then** a legenda é a de hoje.

### Edge Cases

- Um clique sem arrastar não cria marcação (nem retângulo, círculo ou seta de tamanho zero; um ponto do lápis é
  ignorado).
- Arrastar para fora da imagem limita a marcação à borda da imagem.
- Uma seta muito curta continua com a ponta visível e proporcional.
- A janela do editor pode ser redimensionada: as marcações ficam presas à imagem, não à janela, e saem na resolução do
  print.
- Enquanto o Claude está trabalhando, os anexos não podem ser alterados (como hoje), então o editor não abre.
- Remover o anexo (X) remove também as marcações.
- O limite de 5 prints por pedido continua; marcar não cria um anexo novo, substitui a imagem do anexo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O editor de marcações MUST abrir sozinho logo depois de "Anexar print", com o print que acabou de ser
  capturado (Q1 = B). Concluir anexa a imagem (com ou sem marcações); Cancelar ou fechar o editor desiste do print — o
  anexo não é criado. Um print já anexado MUST poder ser reaberto no editor clicando na miniatura.
- **FR-002**: O editor MUST oferecer exatamente quatro ferramentas: Lápis (traço livre), Retângulo pontilhado,
  Circunferência pontilhada (elipse inscrita no retângulo arrastado) e Seta (linha com ponta no ponto final).
- **FR-003**: Todas as marcações MUST ser vermelhas, com uma única espessura legível na resolução do print; não há
  escolha de cor, espessura, texto, preenchimento ou borracha.
- **FR-004**: Cada marcação MUST aparecer enquanto o usuário arrasta e ficar fixa ao soltar.
- **FR-005**: O editor MUST ter Desfazer (a última marcação) e Limpar (todas, desfazível).
- **FR-006**: Concluir MUST anexar (ou, ao reabrir, substituir) a imagem com as marcações, na resolução original do
  print; Cancelar ou fechar MUST não anexar o print novo ou deixar o anexo reaberto como estava.
- **FR-007**: O print original e as marcações MUST ser guardados enquanto o anexo existe, para reabrir o editor e
  continuar editando sem acumular perda de qualidade.
- **FR-008**: A miniatura do anexo e a da conversa MUST mostrar a imagem com as marcações.
- **FR-009**: A legenda enviada com um print marcado MUST dizer que as formas vermelhas foram desenhadas pelo usuário
  para apontar partes da imagem e quais tipos de marcação há.
- **FR-010**: O editor MUST funcionar com mouse e com caneta/toque da tela do Windows.
- **FR-011**: Nada é gravado em disco: as marcações vivem com o anexo e somem quando ele é enviado ou removido.

### Key Entities

- **Anexo de print**: o print original, a lista de marcações e a imagem final (original + marcações) com a legenda.
- **Marcação**: tipo (lápis, retângulo, circunferência, seta) e seus pontos na resolução do print, na ordem em que
  foram feitas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Capturar, marcar um ponto e anexar o print leva menos de 15 segundos; anexar sem marcar custa só um clique a
  mais (Concluir ou Enter).
- **SC-002**: Desfazer, Limpar e reabrir nunca alteram o print original (100% das vezes ele pode ser recuperado
  removendo as marcações).
- **SC-003**: Num teste com o Claude real, um pedido "o que está marcado?" com uma circunferência em volta de uma parte
  do modelo é respondido nomeando essa parte, sem descrever as formas como objetos da cena.
- **SC-004**: As marcações aparecem no lugar exato em que foram desenhadas (erro menor que 2 pixels do print) em
  qualquer tamanho da janela do editor.

## Assumptions

- Vermelho puro (ou próximo) com espessura fixa proporcional ao tamanho do print, pontilhado nos contornos de
  retângulo e circunferência; o traço do lápis e a seta são contínuos.
- "Circunferência" é desenhada pelo retângulo arrastado (elipse inscrita); um quadrado dá uma circunferência.
- O editor é uma janela do próprio roll6anime, sem ferramentas externas.
- Atalhos: Ctrl+Z (Desfazer), Esc (Cancelar) e Enter (Concluir), para anexar sem marcar ser rápido.
- Fora do roll6anime (site do Roll6) nada muda.
