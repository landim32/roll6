# Feature Specification: Editor de animação com salvar explícito

**Feature Branch**: `091-animation-editor-save`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Melhoria no Editor de Animação: está salvando direto, nem pergunta; deve armazenar a última versão e só alterar no banco quando clicar no botão de salvar; a barra de rolagem do prompt dessa tela não está rolando sozinha; na opção criar/incluir deve pedir nome e tipo da animação e, ao clicar em salvar, abrir no editor de animação."

## Clarifications

### Session 2026-10-18

- Q: Onde fica a versão em edição? → A: Só na aba aberta do editor; recarregar ou fechar sem salvar perde as alterações (com confirmação antes).
- Q: Com que conteúdo nasce uma animação criada só com nome e tipo? → A: 1 s parada na pose de repouso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mudanças só vão para a biblioteca ao clicar em "Salvar" (Priority: P1)

Hoje cada osso girado no editor (e cada desfazer/refazer) grava na hora uma nova versão da animação na biblioteca, e as mudanças feitas pelo Claude também. Os tokens que usam a animação passam a tocar a versão nova sem que o usuário tenha confirmado. Com esta mudança o editor trabalha sobre uma **versão em edição**: tudo o que muda (poses giradas, desfazer/refazer, arquivos que o Claude altera) atualiza a prévia e a versão em edição, e a animação da biblioteca só muda quando o usuário clica em **"Salvar"**. Há também **"Descartar"**, que volta à versão salva.

**Why this priority**: é o problema principal relatado — o editor altera a biblioteca sem perguntar.

**Independent Test**: girar um osso, conferir que a animação na biblioteca (lista, outro token, outra aba) continua a mesma; clicar em "Salvar" e conferir que agora mudou.

**Acceptance Scenarios**:

1. **Given** uma animação aberta no editor, **When** o usuário gira um osso, **Then** a prévia mostra a pose nova, o editor indica "alterações não salvas" e a animação da biblioteca não muda.
2. **Given** alterações não salvas, **When** o usuário clica em "Salvar", **Then** a versão em edição é validada e gravada na biblioteca de uma vez, o indicador some e os tokens que usam a animação passam a tocar a nova versão.
3. **Given** alterações não salvas, **When** o usuário clica em "Descartar" e confirma, **Then** a prévia volta à versão salva e o indicador some.
4. **Given** o Claude altera o arquivo da animação durante um pedido, **When** a mudança chega, **Then** ela entra na versão em edição (prévia atualizada, "alterações não salvas") sem gravar na biblioteca.
5. **Given** alterações não salvas, **When** o usuário tenta sair do editor (menu da biblioteca, "Voltar para campanha", fechar/recarregar a aba), **Then** recebe a pergunta "Descartar as alterações?" das outras páginas da biblioteca.
6. **Given** desfazer/refazer, **When** o usuário os usa, **Then** eles andam pelas versões da edição atual sem gravar na biblioteca.
7. **Given** uma versão em edição inválida (por exemplo, um arquivo quebrado do Claude), **When** chega, **Then** ela não substitui a versão em edição e o aviso "Arquivo inválido: …" aparece na conversa, como hoje.

---

### User Story 2 - A conversa rola sozinha (Priority: P1)

Na conversa com o Claude do editor, a lista não acompanha as mensagens novas: a resposta que chega aos poucos, as linhas de ferramenta e os avisos ficam abaixo da área visível. A conversa passa a rolar sozinha para o fim sempre que algo novo aparece — desde que o usuário já esteja no fim; se ele rolou para cima para ler algo antigo, a lista não o puxa de volta.

**Why this priority**: é um defeito simples e visível que atrapalha cada pedido.

**Independent Test**: enviar um pedido longo e ver a resposta chegando sempre visível; rolar para cima no meio e conferir que a lista fica parada.

**Acceptance Scenarios**:

1. **Given** a conversa no fim, **When** chega texto novo do Claude, uma linha de ferramenta ou um aviso, **Then** a lista rola até o fim.
2. **Given** o usuário rolou para cima, **When** chega algo novo, **Then** a lista fica onde está.
3. **Given** o usuário envia uma mensagem, **When** ela aparece, **Then** a lista vai ao fim, mesmo que ele estivesse lendo acima.
4. **Given** o editor aberto, **When** o histórico da conversa carrega, **Then** a lista começa no fim.

---

### User Story 3 - "Incluir animação" pede nome e tipo e abre no editor (Priority: P2)

Hoje "Incluir animação" exige enviar um arquivo pronto. Passa a pedir **o nome e o tipo** da animação e, ao clicar em "Salvar", cria a animação na biblioteca e abre o editor dela, onde o usuário a monta girando os ossos ou pedindo ao Claude.

**Why this priority**: completa o fluxo do editor (criar do zero sem ter um arquivo); depende do salvar explícito para que os primeiros passos não gravem a cada osso.

**Independent Test**: em Animações, clicar em "Incluir animação", preencher nome e tipo, salvar e cair no editor da animação nova.

**Acceptance Scenarios**:

1. **Given** Animações na biblioteca, **When** o usuário clica em "Incluir animação", **Then** vê um formulário com nome (obrigatório) e tipo (Parado, Andando, Correndo, Agachado, Derrotado, Atacando, Defendendo).
2. **Given** nome e tipo preenchidos, **When** clica em "Salvar", **Then** a animação é criada com 1 s parada na pose de repouso (Q2 = A) e o editor dela abre.
3. **Given** o formulário com algo digitado, **When** o usuário tenta sair, **Then** recebe a pergunta "Descartar as alterações?".
4. **Given** um nome vazio, **When** clica em "Salvar", **Then** vê o erro do campo e nada é criado.

---

### Edge Cases

- Duas abas do editor na mesma animação: cada uma tem sua própria versão em edição (só na aba); ao salvar numa, a outra recebe a versão nova da biblioteca e, se tinha alterações não salvas, avisa que a versão salva mudou (sem perder as próprias alterações até o usuário decidir).
- Falha ao salvar (rede, validação): as alterações continuam na versão em edição e a mensagem de erro aparece; nada é perdido.
- O Claude escreve várias versões seguidas: a versão em edição fica com a última válida.
- Uma pose girada enquanto um pedido roda continua bloqueada, como hoje.
- O arquivo de trabalho do console continua acompanhando a versão em edição (o Claude trabalha sobre o que está na tela, não sobre a versão salva).
- "Nova conversa" não descarta a versão em edição.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O editor NÃO DEVE gravar a animação na biblioteca ao girar um osso, desfazer, refazer ou receber um arquivo do Claude; essas mudanças DEVEM ir para a versão em edição.
- **FR-002**: O editor DEVE ter um botão "Salvar", habilitado só com alterações não salvas, que valida e grava a versão em edição na biblioteca como uma única nova versão.
- **FR-003**: O editor DEVE ter "Descartar" (com confirmação) que volta a prévia e a versão em edição à versão salva.
- **FR-004**: O editor DEVE mostrar claramente quando há alterações não salvas.
- **FR-005**: A versão em edição DEVE ficar só na aba aberta do editor (Q1 = A): nada é gravado no servidor até "Salvar"; recarregar ou fechar a aba sem salvar perde as alterações, por isso o editor pergunta antes (FR-006).
- **FR-006**: Sair do editor com alterações não salvas DEVE pedir confirmação, como nas outras páginas da biblioteca.
- **FR-007**: Mudanças do Claude no arquivo da animação DEVEM entrar na versão em edição, validadas como hoje; um arquivo inválido NÃO DEVE substituí-la.
- **FR-008**: O arquivo de trabalho do console DEVE refletir a versão em edição (não só a salva), para que o Claude trabalhe sobre o que o usuário vê.
- **FR-009**: A conversa DEVE rolar até o fim quando chega conteúdo novo e o usuário está no fim (tolerância de alguns pixels), quando o usuário envia uma mensagem e quando o histórico carrega; NÃO DEVE rolar se o usuário subiu para ler.
- **FR-010**: "Incluir animação" DEVE pedir só nome (obrigatório, até 100 caracteres) e tipo; ao salvar DEVE criar a animação e abrir seu editor.
- **FR-011**: Desfazer/refazer DEVEM continuar funcionando dentro da edição, com os mesmos atalhos.

### Key Entities

- **Versão salva**: o conteúdo da animação na biblioteca, que os tokens tocam.
- **Versão em edição**: o conteúdo que o editor mostra, com as mudanças ainda não salvas (poses, desfazer/refazer, arquivos do Claude); vive só na aba aberta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 gravações na biblioteca durante uma sessão de edição sem clicar em "Salvar" (verificável pela data de alteração da animação e pela lista).
- **SC-002**: Um "Salvar" grava exatamente uma nova versão, com todas as mudanças acumuladas.
- **SC-003**: Em 100% das mensagens novas com o usuário no fim da conversa, a última linha fica visível sem rolar à mão.
- **SC-004**: Criar uma animação do zero e chegar ao editor leva no máximo 2 campos e 1 clique.
- **SC-005**: Nenhuma alteração não salva é perdida sem uma confirmação explícita do usuário.

## Assumptions

- As mudanças do Claude também esperam o "Salvar" (o pedido é "só alterar no banco quando clicar no botão de salvar", sem exceção).
- O botão "Salvar" fica na barra superior do editor, junto ao nome da animação; "Descartar" ao lado.
- Desfazer/refazer continuam limitados à sessão (até 100 versões), agora sem gravar.
- O nome e o tipo continuam editáveis na página da animação (087); o formulário de inclusão não pede arquivo.
- Nada muda nas animações já existentes nem no formato `roll6-animation`; nenhuma tabela nova.
- A animação nova de 1 s é um arquivo `roll6-animation` válido sem trilhas (ou com trilhas em 0°), `loop` conforme o tipo (repete para Parado/Andando/Correndo/Agachado/Defendendo, uma vez para Derrotado/Atacando).
