# Feature Specification: Prints pedidos pelo Claude no editor de animação

**Feature Branch**: `094-editor-agent-prints`
**Created**: 2026-10-19
**Status**: Draft
**Input**: User description: "No editor de animação, tem que existir uma dinâmica onde o console pode solicitar um print para a API e ela retorna sempre que necessário. Instrua o modelo de como fazer isso. Então sempre que o modelo alterar algo, ele vai ver o resultado."

## Contexto

Hoje, no editor de animação (`/animation/:id`), o usuário conversa com o Claude da própria máquina através do
Roll6.Console. O Claude edita o arquivo da animação, mas **não vê** o que escreveu: só o usuário vê o modelo 3D se
mexendo no palco, e só o usuário pode anexar prints (com marcações) às mensagens. O Claude trabalha "às cegas" e
depende do usuário para dizer se a pose ficou boa.

Esta funcionalidade fecha esse ciclo: durante um pedido, o Claude pode pedir um print do palco do editor — o mesmo
modelo, a mesma animação que ele acabou de escrever — e recebê-lo de volta para olhar, quantas vezes precisar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O Claude confere o que escreveu (Priority: P1)

O usuário pede "faça o braço direito acenar". O Claude altera o arquivo, pede um print do palco no instante da pose
principal, olha o resultado, percebe que o braço atravessou a cabeça, corrige e pede outro print, até ficar bom. Só
então responde ao usuário.

**Why this priority**: É o objetivo da funcionalidade — o modelo ver o resultado de cada alteração.

**Independent Test**: Com o editor aberto e o console conectado, enviar um pedido de mudança de pose; verificar que o
Claude pede pelo menos um print depois de alterar o arquivo, que o print chega a ele com a pose que ele escreveu e
que a resposta final menciona o que ele viu.

**Acceptance Scenarios**:

1. **Given** um pedido em andamento e o editor aberto, **When** o Claude pede um print, **Then** ele recebe, em
   poucos segundos, uma imagem do palco mostrando o modelo escolhido no editor fazendo a versão da animação que ele
   acabou de escrever, no instante pedido.
2. **Given** o Claude alterou o arquivo duas vezes, **When** ele pede um print depois da segunda alteração, **Then**
   o print mostra a segunda versão, nunca a primeira nem a versão salva na biblioteca.
3. **Given** o Claude recebeu as instruções do pedido, **When** ele altera a animação, **Then** ele pede um print para
   conferir antes de dar a resposta final (as instruções mandam fazer isso sempre que alterar algo).

---

### User Story 2 - Ver de vários ângulos e instantes (Priority: P2)

Para um chute, o Claude pede prints do lado e de frente, no começo, no meio e no fim do movimento, e com o esqueleto
visível para enxergar os ossos.

**Why this priority**: Um único ângulo esconde erros (um braço que parece certo de frente e está para trás de lado).

**Independent Test**: Pedir prints com instantes e lados diferentes e conferir que cada imagem corresponde ao pedido e
traz uma legenda dizendo o instante, o lado da câmera e se o esqueleto estava visível.

**Acceptance Scenarios**:

1. **Given** um pedido de print com instante 0,5 s e câmera de lado, **When** o print chega, **Then** a imagem mostra o
   modelo de lado naquele instante e a legenda diz isso.
2. **Given** um pedido de vários prints de uma vez, **When** eles chegam, **Then** cada um vem com sua legenda, na
   ordem pedida.
3. **Given** um pedido com o esqueleto visível, **When** o print chega, **Then** os ossos aparecem sobre o modelo como
   no botão "Esqueleto" do editor.

---

### User Story 3 - O usuário acompanha os prints (Priority: P3)

Enquanto o Claude trabalha, o usuário vê na conversa que ele pediu um print e uma miniatura do que foi enviado, sem
que o palco dele mude de instante ou de câmera.

**Why this priority**: Transparência e confiança — o usuário sabe o que o Claude está olhando — mas a funcionalidade
serve mesmo sem isso.

**Independent Test**: Durante um pedido com prints, verificar que cada print aparece como uma linha da conversa com
miniatura e que o palco do usuário continua onde estava.

**Acceptance Scenarios**:

1. **Given** um pedido em andamento, **When** o Claude pede um print, **Then** a conversa mostra uma linha
   "Print para o Claude: …" com a miniatura, que pode ser ampliada.
2. **Given** o usuário está olhando o palco num instante e ângulo próprios, **When** o print é tirado, **Then** a
   visão do usuário não muda.

---

### Edge Cases

- **Editor fechado ou outra aba**: o print vem da aba do editor que enviou o pedido. Se ela foi fechada ou perdeu a
  conexão, o Claude recebe uma resposta de erro clara ("o editor não está aberto") e segue sem a imagem.
- **Demora**: se o print não chega em 20 segundos, o Claude recebe um erro de tempo esgotado e pode tentar de novo.
- **Arquivo inválido**: se a última versão escrita pelo Claude não é uma animação válida, o print não é tirado e o
  Claude recebe o mesmo erro de validação que hoje vira aviso na conversa.
- **Sem modelo 3D escolhido / esqueleto não Mixamo**: o print é recusado com uma mensagem dizendo o motivo.
- **Abuso / laço**: no máximo 30 prints por pedido e 6 por solicitação; além disso o Claude recebe um erro dizendo
  que o limite foi atingido.
- **Pedido parado ("Parar") ou terminado**: pedidos de print pendentes desse pedido são descartados; um print fora de
  um pedido em andamento é recusado.
- **Instante fora da animação**: o instante é limitado à duração da animação (0 a duração).
- **Usuário editando no palco ao mesmo tempo**: a edição bloqueada durante um pedido continua bloqueada; o print usa a
  versão do Claude, não a do usuário.
- **Perguntas da mesa (093)**: execuções somente leitura do "Perguntar" não podem pedir prints.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Durante um pedido do editor de animação em andamento, o Claude DEVE poder pedir um ou mais prints do
  palco e recebê-los de volta como imagens que ele consegue olhar.
- **FR-002**: O print DEVE mostrar o modelo 3D escolhido no editor (com as armas, se o editor as mostra) fazendo a
  **última versão do arquivo escrita pelo Claude** nesse pedido; sem alteração ainda, a versão em edição da aba.
- **FR-003**: Cada solicitação DEVE permitir escolher, por print: o instante (em segundos ou "pose principal"), o lado
  da câmera (frente, costas, direita, esquerda, cima, três quartos) e se o esqueleto aparece; valores omitidos usam
  um padrão (pose principal, três quartos, sem esqueleto).
- **FR-004**: Cada print DEVE vir com uma legenda em português com a animação, o instante, o lado da câmera, se o
  esqueleto estava visível e as armas do modelo — a mesma legenda que o usuário já anexa aos prints dele.
- **FR-005**: O print DEVE ser tirado sem alterar o que o usuário vê no palco (instante, câmera, esqueleto) e sem
  tocar na versão em edição nem na versão salva.
- **FR-006**: As instruções que o Claude recebe em cada pedido do editor DEVEM explicar como pedir um print, os
  parâmetros e os limites, e mandar conferir com prints **depois de cada alteração** do arquivo, antes da resposta
  final.
- **FR-007**: A conversa do editor DEVE mostrar cada print enviado ao Claude como uma linha com miniatura ampliável;
  as imagens não são guardadas no servidor (como os prints do usuário hoje).
- **FR-008**: Pedidos de print DEVEM ser aceitos apenas da máquina que está rodando aquele pedido e apenas para a aba
  do editor do dono da animação que enviou o pedido.
- **FR-009**: Falhas (editor fechado, tempo esgotado em 20 s, arquivo inválido, sem modelo, limite atingido, pedido
  parado) DEVEM voltar ao Claude como mensagens de erro claras em português, sem travar o pedido.
- **FR-010**: Limites: no máximo 6 prints por solicitação e 30 por pedido.
- **FR-011**: Execuções somente leitura (as perguntas da mesa, 093) NÃO DEVEM ter acesso a prints.
- **FR-012**: O console continua genérico: ele só repassa o pedido de print e devolve a imagem ao Claude; o que é um
  print do editor de animação é decidido pelo servidor e pela página.

### Key Entities

- **Pedido de print**: feito pelo Claude durante um pedido do editor — lista de até 6 prints (instante, lado da
  câmera, esqueleto). Vive só enquanto o pedido está em andamento; não é guardado.
- **Print**: imagem do palco + legenda, devolvida ao Claude e mostrada na conversa da aba; não é guardada no servidor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em pedidos que alteram a animação, o Claude pede ao menos um print depois da última alteração em pelo
  menos 9 de cada 10 pedidos.
- **SC-002**: Um print chega ao Claude em até 5 segundos depois de pedido, com o editor aberto, em 95% das vezes.
- **SC-003**: Em 100% dos prints, a pose mostrada é a última versão escrita pelo Claude (nunca uma versão anterior).
- **SC-004**: Tirar um print nunca muda a visão do usuário no palco.
- **SC-005**: O usuário precisa anexar prints manualmente para apontar erros visíveis com menos frequência do que
  hoje (meta: metade dos pedidos que hoje exigem um print do usuário passam a ser resolvidos sem ele).

## Assumptions

- O Claude Code consegue olhar imagens que estejam na pasta de trabalho do console, e consegue executar um comando ou
  ferramenta que o console disponibiliza para pedir o print e esperar a resposta; o mecanismo exato fica para o plano.
- O print é desenhado pela aba do editor (o modelo 3D só existe no navegador); por isso a aba precisa estar aberta.
- Valem a ligação existente aba ↔ servidor ↔ console (086) e a regra de uma execução por vez por máquina.
- Os prints seguem as regras dos prints do usuário (064/086): imagem do palco com a pose estampada no canto e
  legenda; sem marcações vermelhas, que são do usuário.
- Só o editor de animação é coberto; o "Perguntar" da mesa e outras telas ficam de fora.
