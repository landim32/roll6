# Feature Specification: Editar a pose girando os ossos no roll6anime

**Feature Branch**: `066-roll6anime-pose-editing`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "opção A com a forma 1" — em resposta a "Será que é possível mover os pontos do esqueleto?":
**forma 1** = clicar numa junta do esqueleto e girar aquele osso com anéis de rotação (o resto do corpo acompanha);
**opção A** = a ferramenta grava a pose no arquivo de animação, no instante atual (criando uma pose nova se estiver
entre duas).

## Clarifications

### Session 2026-10-14

- Q: O que muda — o modelo (.glb) ou a animação? → Só o arquivo da animação (`.json`); o `.glb` nunca é alterado. O
  esqueleto na tela é só onde clicar.
- Q: Um osso sem trilha no arquivo, girado numa pose — como fica nas outras? → A: muda só naquela pose; nas outras
  poses-chave fica na pose de descanso (como estava).
- Q: Edições não gravadas ao trocar de animação ou fechar? → Não há edição "não gravada": **cada rotação é gravada ao
  soltar o anel** e entra num **histórico**; **Ctrl+Z volta** à versão anterior do arquivo (Ctrl+Y refaz).

## Contexto

Com o esqueleto visível (065), o usuário vê os ossos, seus nomes e a pose-chave do instante, mas para corrigir um
ângulo ainda precisa pedir ao Claude. Esta funcionalidade deixa girar um osso direto na vista 3D e gravar o resultado no
arquivo da animação aberta. **Ela muda uma regra da 062**: a ferramenta passa a gravar arquivos de animação — só por
esta ação do usuário (girar ou desfazer/refazer), só o arquivo aberto, sempre validado com as mesmas regras do Roll6.
O modelo `.glb` nunca é alterado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Girar um osso na pose atual (Priority: P1)

Com o esqueleto ligado e a animação pausada numa pose, o usuário clica na junta do cotovelo esquerdo: aparecem anéis de
rotação em volta dela. Arrastando um anel, o antebraço gira em volta daquele eixo e a mão acompanha; os graus aparecem
enquanto arrasta.

**Why this priority**: é a manipulação pedida; sem ela não há o que gravar.

**Independent Test**: pausar o `aceno-duplo` na pose 3, selecionar `LeftForeArm`, girar 30° num anel e ver o antebraço
e a mão na pose nova.

**Acceptance Scenarios**:

1. **Given** o esqueleto ligado e a animação pausada, **When** o usuário clica numa junta, **Then** aquele osso fica
   selecionado (nome visível) e aparecem três anéis de rotação (um por eixo) em volta da junta.
2. **Given** um osso selecionado, **When** o usuário arrasta um anel, **Then** o osso gira em volta daquele eixo, os
   ossos filhos acompanham, e o ângulo da rotação aparece enquanto arrasta.
3. **Given** a animação tocando, **When** o usuário clica numa junta, **Then** a animação pausa no instante atual antes
   de selecionar.
4. **Given** um osso selecionado, **When** o usuário clica fora do esqueleto ou aperta Esc, **Then** a seleção some.
5. **Given** o esqueleto desligado, **When** o usuário clica no modelo, **Then** nada é selecionado (girar a câmera
   continua como hoje).
6. **Given** um osso fora dos 52 ossos que o formato de animação aceita, **When** o usuário clica nele, **Then** ele
   não fica editável e a ferramenta diz por quê.

---

### User Story 2 - Cada rotação vai para o arquivo (Priority: P1)

Ao soltar o anel, a rotação é gravada no arquivo da animação aberta, no instante atual; se o instante estava entre duas
poses, vira uma pose nova. Não há botão "Gravar" nem edição pendente.

**Why this priority**: é a opção A — a edição tem de mudar a animação.

**Independent Test**: girar o `LeftForeArm` na pose 3 do `aceno-duplo`, soltar e conferir no arquivo que a chave da
pose 3 do `LeftForeArm` mudou e que o resto do arquivo ficou igual.

**Acceptance Scenarios**:

1. **Given** a animação pausada numa pose-chave, **When** o usuário solta o anel depois de girar um osso, **Then** a
   chave daquele instante desse osso passa a ter os graus novos, no mesmo formato do arquivo, e nada mais muda.
2. **Given** a animação pausada entre duas poses, **When** o usuário solta o anel, **Then** uma chave nova é criada
   naquele instante para o osso girado, e a barra passa a contar uma pose a mais.
3. **Given** um osso que não tinha trilha no arquivo, **When** o usuário o gira e solta, **Then** ele ganha uma trilha
   com a rotação nova naquele instante e a pose de descanso (0°) em cada uma das outras poses-chave do arquivo, de modo
   que nas outras poses ele continua como estava (Q1 = A).
4. **Given** a rotação gravada, **When** o arquivo muda na pasta, **Then** a vista toca a versão nova sem perder o
   instante, a câmera nem o osso selecionado.
5. **Given** uma rotação que deixaria o arquivo inválido (ex.: mais chaves que o limite), **When** o usuário solta o
   anel, **Then** nada é gravado, o osso volta à pose do arquivo e aparece a mesma mensagem de erro que o Roll6 daria.
6. **Given** o Claude trabalhando num pedido, **When** o esqueleto está ligado, **Then** os anéis ficam desativados até
   o pedido terminar (para os dois não gravarem o arquivo ao mesmo tempo).
7. **Given** uma rotação gravada, **When** o usuário troca de animação, abre outro modelo, retoma a reprodução ou fecha
   a janela, **Then** nada é perguntado: tudo já está no arquivo e no histórico.

---

### User Story 3 - Histórico com Ctrl+Z (Priority: P1)

A ferramenta guarda o histórico das versões de cada animação aberta: cada rotação gravada e cada versão nova que chega
na pasta (por exemplo, a que o Claude gravou). Ctrl+Z volta o arquivo à versão anterior; Ctrl+Y refaz.

**Why this priority**: como cada rotação já grava, o histórico é o que permite errar sem medo (Q2).

**Independent Test**: girar dois ossos (duas versões), Ctrl+Z duas vezes → o arquivo volta ao conteúdo original;
Ctrl+Y → reaparece a primeira rotação.

**Acceptance Scenarios**:

1. **Given** duas rotações gravadas, **When** o usuário aperta Ctrl+Z, **Then** o arquivo volta à versão de antes da
   última rotação (conteúdo idêntico) e a vista mostra essa versão no mesmo instante.
2. **Given** um Ctrl+Z feito, **When** o usuário aperta Ctrl+Y, **Then** a versão desfeita volta.
3. **Given** um Ctrl+Z feito, **When** o usuário faz uma rotação nova, **Then** o que tinha sido desfeito sai do refazer
   (como em qualquer editor).
4. **Given** o Claude gravou uma versão nova do arquivo, **When** o usuário aperta Ctrl+Z, **Then** o arquivo volta à
   versão de antes do Claude.
5. **Given** o histórico de uma animação, **When** o usuário troca para outra e volta, **Then** o histórico daquela
   animação continua lá (enquanto a ferramenta estiver aberta).
6. **Given** nada a desfazer, **When** o usuário aperta Ctrl+Z, **Then** nada acontece; a vista mostra quantos passos há
   para desfazer e refazer.
7. **Given** o Claude trabalhando, **When** o usuário aperta Ctrl+Z, **Then** nada é gravado até o pedido terminar.

### Edge Cases

- Modelo cujo esqueleto não usa os nomes do Mixamo: a edição fica desativada (as animações não se aplicam a ele).
- Ângulos: os graus gravados ficam dentro do limite do formato (|graus| ≤ 360), com no máximo 1 casa decimal.
- Animação que repete: editar a primeira pose (instante 0) também atualiza a última, se ela estiver no fim, para a volta
  continuar sem salto; e vice-versa.
- Uma rotação que não muda nada (soltar o anel sem girar) não grava nem entra no histórico.
- O levantamento do quadril não é editado por esta funcionalidade; girar o quadril gira o corpo.
- A ferramenta nunca grava outro arquivo além do aberto, nunca cria um arquivo novo e nunca altera o modelo `.glb`.
- Um arquivo apagado ou renomeado leva junto o seu histórico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Com o esqueleto ligado, clicar numa junta MUST selecionar aquele osso, pausando a animação se estiver
  tocando.
- **FR-002**: O osso selecionado MUST mostrar anéis de rotação nos três eixos; arrastar um anel MUST girar o osso em
  volta daquele eixo, com os filhos acompanhando e o ângulo visível durante o arrasto.
- **FR-003**: Só os ossos que o formato de animação aceita MUST ser editáveis; modelos fora do padrão Mixamo MUST ter a
  edição desativada.
- **FR-004**: Soltar o anel MUST gravar a rotação no arquivo aberto na hora; não há edição pendente nem botão Gravar.
- **FR-005**: A gravação MUST escrever, no instante atual, os graus do osso girado — substituindo a chave existente
  naquele instante ou criando uma nova; um osso sem trilha ganha a trilha com a pose de descanso nas outras poses-chave
  (Q1 = A) — de modo que o arquivo gravado toca exatamente a pose editada naquele instante.
- **FR-006**: A gravação MUST validar o arquivo resultante com as mesmas regras do Roll6 e não gravar nada se ele for
  inválido, mostrando a mensagem.
- **FR-007**: A gravação MUST preservar tudo o que não foi editado no arquivo (outras trilhas, outras chaves, nome,
  tipo, duração, repetição, levantamento do quadril, campos extras).
- **FR-008**: Girar e Ctrl+Z/Ctrl+Y MUST ficar bloqueados enquanto o Claude trabalha num pedido.
- **FR-009**: Em animações que repetem, uma edição no instante 0 ou no último instante MUST manter as duas pontas iguais.
- **FR-010**: A ferramenta MUST guardar, por animação, o histórico das versões do arquivo durante a sessão — as
  rotações gravadas e as versões novas que chegam na pasta — e Ctrl+Z/Ctrl+Y MUST voltar/refazer gravando a versão
  anterior/seguinte exata no arquivo (Q2).
- **FR-011**: A regra da 062 ("a ferramenta nunca grava animações") MUST ser atualizada: grava só o arquivo aberto, só
  por girar um osso ou desfazer/refazer, sempre validado; o `.glb` nunca é alterado.

### Key Entities

- **Histórico da animação**: as versões do arquivo (conteúdo exato) na ordem em que existiram nesta sessão, a posição
  atual e o que pode ser refeito.
- **Arquivo de animação**: o `roll6-animation` aberto; ganha ou troca chaves nas trilhas editadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Girar um osso e tê-lo gravado leva menos de 20 segundos para quem já pausou na pose.
- **SC-002**: Depois de gravar, a pose tocada naquele instante coincide com a pose editada (diferença menor que 1° em
  cada osso editado).
- **SC-003**: Em 100% das gravações, as partes do arquivo não editadas ficam idênticas (mesmos valores) às de antes.
- **SC-004**: Um arquivo que ficaria inválido nunca é gravado.
- **SC-005**: Um pedido seguinte ao Claude ("o que mudou na pose 3?") reconhece a mudança gravada.
- **SC-006**: Ctrl+Z devolve o arquivo byte a byte ao conteúdo da versão anterior em 100% dos casos.

## Assumptions

- A edição acontece só com a animação pausada; o instante editado é o mostrado na barra (065 mostra a pose).
- Os graus gravados seguem a convenção do formato (no quadro do personagem, sobre a pose de descanso), com 1 casa decimal.
- Não há edição de posição (só rotação), nem do levantamento do quadril, nem do tempo das chaves.
- O histórico vive enquanto a ferramenta está aberta (não é guardado entre aberturas) e tem até 100 versões por
  animação; a mais antiga sai quando passa disso.
- Depende da 065 (esqueleto, juntas, pose-chave) e da 059 (formato e validação).
