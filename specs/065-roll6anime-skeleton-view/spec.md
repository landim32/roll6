> **Superseded by 086-web-animation-editor** (2026-10-18): the Windows tool `roll6anime/` was removed; its capabilities live in the web editor (`/animation/:id`) and the generic console `backend/Roll6.Console`. Kept as history.

# Feature Specification: Esqueleto na vista 3D do roll6anime

**Feature Branch**: `065-roll6anime-skeleton-view`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "No roll6anime, crie um botão "Esqueleto" que liga e desliga a exibição dos ossos do modelo sobre a vista 3D: os ossos aparecem por cima do modelo (visíveis mesmo dentro da malha) e acompanham a animação, a barra de tempo e a pausa; com o esqueleto ligado, o modelo fica semitransparente, o nome do osso aparece ao passar o mouse, e os ossos que a animação aberta movimenta ficam destacados em outra cor. Com o esqueleto ligado, o "Anexar print" sai com os ossos desenhados e a legenda avisa o Claude."

## Adendo (pedido após a implementação)

- A barra mostra a **pose-chave** do instante ("Pose 3 de 5" / "Entre as poses 2 e 3 (de 5)"; as poses são os instantes
  com chave em alguma trilha ou no levantamento do quadril, a até 0,02 s), e o print a leva escrita no canto e na
  legenda.

## Contexto

O roll6anime mostra o modelo 3D tocando as animações, mas o esqueleto que as move é invisível. Para entender por que um
braço torce errado, ou para pedir ao Claude "gire mais o LeftForeArm", o usuário precisa ver os ossos, saber o nome de
cada um e quais deles a animação aberta realmente movimenta. Esta funcionalidade acrescenta um botão **Esqueleto** à
vista 3D (depende da 064 para o print com marcações; aqui o print só ganha os ossos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os ossos animados (Priority: P1)

O usuário liga **Esqueleto**: o modelo fica semitransparente e os ossos aparecem como linhas por cima dele, mexendo-se
com a animação. Pausando ou arrastando a barra de tempo, os ossos param na pose daquele instante. Desligando, tudo
volta ao normal.

**Why this priority**: é o pedido central; sem ver os ossos, as outras partes não têm onde aparecer.

**Independent Test**: abrir um modelo com uma animação, ligar o Esqueleto, tocar, pausar, arrastar a barra e desligar.

**Acceptance Scenarios**:

1. **Given** um modelo aberto, **When** o usuário liga Esqueleto, **Then** os ossos aparecem sobre o modelo, inteiros,
   mesmo os que estão dentro da malha, e o modelo fica semitransparente.
2. **Given** o esqueleto ligado e a animação tocando, **When** o tempo passa, **Then** os ossos acompanham a pose a cada
   quadro, sem atraso visível em relação à malha.
3. **Given** o esqueleto ligado, **When** o usuário pausa ou arrasta a barra de tempo, **Then** os ossos mostram a
   pose daquele instante.
4. **Given** o esqueleto ligado, **When** o usuário o desliga, **Then** os ossos somem e o modelo volta a ser opaco,
   exatamente como antes.
5. **Given** o esqueleto ligado, **When** o usuário abre outro modelo ou troca de animação, **Then** o esqueleto
   continua ligado e passa a mostrar o novo modelo ou a nova animação.
6. **Given** nenhum modelo aberto, **When** a janela está assim, **Then** o botão Esqueleto fica desativado.

---

### User Story 2 - Saber o nome de cada osso e quais a animação usa (Priority: P2)

Com o esqueleto ligado, passar o mouse perto de um osso mostra o nome dele (o mesmo nome usado nos arquivos de
animação, como "LeftForeArm"). Os ossos que a animação aberta movimenta aparecem numa cor de destaque; os outros, numa
cor neutra.

**Why this priority**: torna os pedidos ao Claude precisos ("o LeftHand", não "aquela mão") e mostra na hora se uma
parte não está sendo animada.

**Independent Test**: com uma animação que só mexe os braços, ligar o Esqueleto: só os ossos dos braços estão
destacados; passar o mouse sobre o antebraço esquerdo mostra "LeftForeArm".

**Acceptance Scenarios**:

1. **Given** o esqueleto ligado, **When** o mouse fica perto de um osso, **Then** aparece o nome dele junto ao
   ponteiro e o osso fica realçado; afastando o mouse, o nome some.
2. **Given** dois ossos perto do ponteiro, **When** o nome aparece, **Then** é o do osso mais perto do ponteiro na
   tela.
3. **Given** uma animação aberta, **When** o esqueleto está ligado, **Then** os ossos que ela movimenta ficam na cor
   de destaque e os demais na cor neutra; sem animação aberta, todos ficam na cor neutra.
4. **Given** o nome mostrado, **When** o modelo usa o prefixo do Mixamo nos ossos ("mixamorig:LeftForeArm"), **Then**
   o nome aparece sem o prefixo, como nos arquivos de animação.
5. **Given** a animação aberta muda (o Claude grava uma versão nova), **When** ela passa a mexer outros ossos, **Then**
   o destaque se atualiza sozinho.

---

### User Story 3 - Print com os ossos (Priority: P2)

Com o esqueleto ligado, "Anexar print" captura a vista como está — modelo semitransparente e ossos desenhados — e a
legenda avisa o Claude que as linhas são o esqueleto, com a cor dos ossos animados.

**Why this priority**: o Claude passa a ver o mesmo que o usuário ao discutir um osso.

**Independent Test**: com o esqueleto ligado, anexar um print e perguntar ao Claude qual osso está destacado.

**Acceptance Scenarios**:

1. **Given** o esqueleto ligado, **When** o usuário anexa um print, **Then** o print tem o modelo semitransparente e os
   ossos com as mesmas cores da tela.
2. **Given** um print com o esqueleto, **When** é enviado, **Then** a legenda diz que as linhas são o esqueleto do
   modelo, que a cor de destaque marca os ossos movimentados pela animação aberta e a cor neutra os outros.
3. **Given** o esqueleto desligado, **When** o usuário anexa um print, **Then** o print e a legenda são os de hoje.
4. **Given** o nome de um osso visível pelo mouse no momento do print, **When** o print é capturado, **Then** o nome
   não entra no print (só os ossos).

### Edge Cases

- Modelo sem esqueleto (malha estática): o botão fica ativo, mas avisa "Este modelo não tem esqueleto" e nada é
  desenhado.
- Modelo cujo esqueleto não usa os nomes do Mixamo: os ossos aparecem com os nomes do arquivo; nenhum fica destacado
  (as animações não se aplicam a ele, aviso que já existe).
- Ossos muito curtos ou sobrepostos (dedos): continuam desenhados; o nome mostrado é o do mais perto do ponteiro.
- Girar a câmera arrastando: o nome do osso não atrapalha o arrasto e some enquanto a câmera gira.
- A cor de destaque e a neutra precisam ser distintas do vermelho das marcações da 064.
- O estado do botão é lembrado para a próxima vez que a ferramenta abrir.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A vista 3D MUST ter um botão **Esqueleto** que liga e desliga a exibição dos ossos, desativado sem
  modelo aberto.
- **FR-002**: Com o esqueleto ligado, os ossos MUST aparecer como linhas entre cada osso e seu pai, desenhadas por cima
  do modelo (nunca escondidas pela malha), e o modelo MUST ficar semitransparente.
- **FR-003**: Os ossos MUST acompanhar a pose mostrada em todo momento: tocando, pausado e ao arrastar a barra de
  tempo.
- **FR-004**: Desligar MUST deixar a vista exatamente como antes (modelo opaco, sem linhas).
- **FR-005**: O estado do botão MUST continuar ao trocar de modelo ou de animação e ser lembrado entre aberturas da
  ferramenta.
- **FR-006**: Com o esqueleto ligado, o nome do osso mais próximo do ponteiro (até uma pequena distância na tela) MUST
  aparecer junto ao ponteiro, sem o prefixo do Mixamo, e esse osso MUST ficar realçado.
- **FR-007**: Os ossos que a animação aberta movimenta MUST aparecer numa cor de destaque e os demais numa cor neutra;
  o destaque MUST se atualizar quando a animação muda.
- **FR-008**: "Anexar print" com o esqueleto ligado MUST capturar os ossos e a transparência como estão na tela, sem o
  nome do osso sob o ponteiro.
- **FR-009**: A legenda de um print com esqueleto MUST explicar ao Claude o que são as linhas e o que significam as
  duas cores.
- **FR-010**: Um modelo sem esqueleto MUST mostrar um aviso em vez de ossos.

### Key Entities

- **Exibição do esqueleto**: ligada/desligada (lembrada), o modelo aberto e a animação aberta.
- **Osso mostrado**: nome (sem prefixo), pai, posição na pose atual, se é movimentado pela animação aberta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ligar ou desligar o esqueleto muda a vista em menos de meio segundo.
- **SC-002**: A vista continua fluida com o esqueleto ligado (sem queda perceptível de quadros num modelo de ~65 ossos).
- **SC-003**: Em 100% dos casos testados, o nome mostrado ao passar o mouse é o do osso sob o ponteiro e coincide com
  o nome usado nos arquivos de animação.
- **SC-004**: Com uma animação que movimenta só alguns ossos, exatamente esses ossos aparecem destacados.
- **SC-005**: Num teste com o Claude real, um print com o esqueleto ligado permite a ele dizer quais ossos estão
  destacados (pelos nomes ou pelas partes do corpo).

## Assumptions

- Cores: destaque em laranja/âmbar e neutra em ciano claro, contrastando com o fundo escuro e com o vermelho das
  marcações; transparência do modelo em torno de 35% de opacidade.
- Os ossos "movimentados pela animação" são os que têm trilha no arquivo aberto (inclusive os que só repetem o mesmo
  valor); o levantamento do quadril (hipsLift) destaca o osso do quadril.
- O nome aparece ao passar o mouse; não há lista de ossos nem seleção por clique.
- O botão fica junto da barra de tempo da vista 3D.
- Depende da 064 (anexo de print e legenda); nada muda no site do Roll6.
