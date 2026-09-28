# Feature Specification: Peça de NPC mostra vida, energia, status e ficha corretos

**Feature Branch**: `026-fix-npc-piece-vitals`
**Created**: 2026-09-28
**Status**: Draft
**Type**: Bug fix
**Input**: User description: "Bug: peça de NPC mostra PV, energia e status zerados na tela. NPC posicionado no mapa (`place_npc_on_map` e depois `update_map_npc`) aparece com vida 0, energia 0, status vazio e sem ficha, embora `list_map_tokens` e `list_map_npcs` devolvam os valores certos. Personagens não têm o problema. Achar e documentar o caminho da tela que lê os campos crus da peça, corrigir usando uma fonte da verdade só (a ocorrência do NPC), mostrar a ficha do NPC na peça, cobrir com testes e revisar a descrição de `update_map_token` no MCP."

## Contexto do problema

Um NPC colocado no mapa é uma **ocorrência** com nome, vida, energia e status próprios (vários goblins do mesmo
NPC, cada um com sua vida). A ocorrência é a dona desses valores, assim como a participação é dona dos valores de
um personagem na campanha. Hoje:

- As listas consultadas por ferramentas externas mostram a ocorrência corretamente (ex.: vida 11, status "Montado,
  cavalo exausto").
- Na mesa, a mesma peça aparece com **vida 0, energia 0, sem status e sem ficha**, até que alguém grave esses valores
  diretamente na peça — um contorno que cria uma segunda cópia dos dados e pode divergir de novo.
- Personagens não têm o problema.

### Investigação (FR-001) e decisão

- Todos os caminhos que devolvem uma peça (lista do mapa, criação, movimento, troca de token, edição e os eventos em
  tempo real) já juntam os dados da ocorrência. **Nenhuma tela do app lê os campos crus da peça**: o relato veio de um
  assistente externo, e a mesa do app não mostra vida/energia/status de peça nenhuma.
- A única tela com barras de NPC é o card do painel de NPCs, que mostra os valores **do NPC da biblioteca** (atual =
  total = vida do NPC), não os da ocorrência — por isso a mesa nunca reflete `update_map_npc`.
- A ficha da peça de NPC não é juntada (fica vazia) — defeito confirmado.
- Decisão do usuário (2026-09-28): cada **ocorrência no mapa** passa a ter **vida e energia atuais** explícitas, com os
  **totais vindos do NPC da biblioteca**, como a participação de um personagem (atual/total). O card do painel de NPCs
  mostra as ocorrências do mapa aberto com atual/total e status.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O mestre vê o NPC com os valores certos na mesa (Priority: P1)

O mestre coloca um NPC no mapa e, durante o jogo, baixa a vida dele e descreve o estado ("Montado, cavalo exausto").
Ele e os jogadores veem na mesa — na peça, na barra de vida e na janela/ficha da peça — exatamente os valores e o
status da ocorrência, sem nenhum passo extra.

**Why this priority**: É o defeito relatado; sem isso a mesa mostra informação errada durante o combate.

**Independent Test**: Colocar um NPC com vida 11 e energia 11, alterar a ocorrência para vida 1 e um status, abrir o
mapa: a peça mostra 1/11 de vida, a energia certa e o status, igual ao que as listas externas devolvem.

**Acceptance Scenarios**:

1. **Given** um NPC da biblioteca com vida 11 e energia 11, **When** o mestre o coloca no mapa, **Then** a peça aparece na mesa com vida 11 e energia 11 (não 0).
2. **Given** a peça do NPC no mapa, **When** o mestre altera a ocorrência para vida 1 e status "Montado, cavalo exausto", **Then** todos os lugares da mesa que mostram a peça passam a mostrar vida 1 e esse status, sem recarregar a página.
3. **Given** o mesmo NPC colocado duas vezes, **When** só uma ocorrência é alterada, **Then** cada peça mostra os valores da sua própria ocorrência.
4. **Given** qualquer peça de NPC, **When** comparada com o que as listas externas devolvem para ela, **Then** nome, vida, energia e status são idênticos.
5. **Given** que ninguém gravou valores diretamente na peça, **When** a mesa é aberta por outro usuário (jogador aprovado), **Then** ele vê os mesmos valores corretos.

---

### User Story 2 - A ficha da peça de NPC mostra a ficha do NPC (Priority: P2)

Ao abrir a ficha de uma peça de NPC, o mestre vê a ficha do NPC da biblioteca, como já acontece com a peça de um
personagem, que mostra a ficha dele.

**Why this priority**: Completa a correção; a ficha vazia atrapalha, mas a vida/status errados são mais graves.

**Independent Test**: NPC com ficha preenchida colocado no mapa; abrir a ficha da peça mostra essa ficha.

**Acceptance Scenarios**:

1. **Given** um NPC com ficha preenchida, **When** a ficha da sua peça é aberta, **Then** mostra a ficha do NPC.
2. **Given** um NPC sem ficha, **When** a ficha da peça é aberta, **Then** aparece vazia, como hoje.
3. **Given** a ficha do NPC alterada na biblioteca, **When** a ficha da peça é reaberta, **Then** mostra a versão nova.

---

### User Story 3 - Personagens continuam iguais (Priority: P1)

As peças de personagens continuam mostrando os dados da participação na campanha (nome, vida/energia atuais,
status, ficha), sem nenhuma mudança de comportamento.

**Why this priority**: Evitar regressão na parte que hoje funciona.

**Independent Test**: Alterar a vida e o status de um personagem na campanha e ver a peça refletir, como hoje.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado com peça no mapa, **When** sua vida atual e status mudam, **Then** a peça mostra os novos valores, como antes desta correção.

---

### Edge Cases

- Peças antigas em que alguém já gravou valores diretamente (o contorno usado): passam a mostrar os valores da ocorrência; os valores gravados na peça deixam de ter efeito na exibição.
- Ocorrência com vida zero ou negativa (NPC caído): a peça mostra esse valor, não um "0" genérico.
- Atualização em tempo real: quando a ocorrência muda, as mesas abertas refletem a mudança sem recarregar; o mesmo vale ao mover a peça (o movimento não pode trazer de volta valores zerados).
- Peças de objeto (sem NPC nem personagem) continuam usando os próprios campos da peça.
- A orientação para assistentes/ferramentas externas sobre qual operação usar para alterar vida/status de um NPC deve refletir o comportamento corrigido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O caminho da interface que exibe os dados "crus" da peça de NPC DEVE ser identificado e documentado (onde, e por que mostrava 0/vazio) antes da correção.
- **FR-002**: Para uma peça de NPC, nome, vida, energia e status exibidos em qualquer lugar da mesa DEVEM vir da ocorrência do NPC no mapa (uma única fonte da verdade).
- **FR-003**: A correção NÃO DEVE depender de copiar os valores da ocorrência para a peça a cada gravação; se uma cópia for inevitável, ela DEVE acontecer ao criar e ao alterar a ocorrência, na mesma gravação, com a justificativa registrada.
- **FR-004**: A ficha exibida para uma peça de NPC que não tenha ficha própria DEVE ser a ficha do NPC da biblioteca.
- **FR-005**: Alterações da ocorrência DEVEM aparecer nas mesas abertas sem recarregar a página, e nenhuma outra ação sobre a peça (mover, trocar token) pode fazê-la voltar a mostrar valores zerados.
- **FR-006**: Peças de personagens e de objetos DEVEM manter o comportamento atual.
- **FR-007**: As orientações dadas a assistentes e ferramentas externas sobre como alterar vida/energia/status de um NPC no mapa DEVEM ser revistas e ajustadas ao comportamento corrigido.
- **FR-009**: Cada ocorrência de NPC no mapa DEVE ter vida e energia **atuais** próprias (podem chegar a zero ou abaixo = caído), com os **totais** vindos do NPC da biblioteca; ao posicionar, as atuais começam iguais aos totais.
- **FR-010**: O card do NPC no painel DEVE mostrar, para cada ocorrência do mapa aberto, vida e energia atual/total e o status; sem ocorrências no mapa, mostra os totais do NPC.
- **FR-011**: Baixar a vida/energia total de um NPC na biblioteca DEVE baixar junto as atuais das ocorrências que ficarem acima do novo total (mesma regra dos personagens).
- **FR-008**: Testes automatizados DEVEM cobrir: peça de NPC recém-colocada com os valores da ocorrência; peça após a alteração da ocorrência; ficha do NPC na peça; e a regressão das peças de personagem. Se a regra de exibição tiver espelho entre as partes do sistema, as duas DEVEM ser corrigidas juntas.

### Key Entities

- **Ocorrência de NPC no mapa**: dona de nome, **vida atual**, **energia atual** e status daquele NPC naquele mapa; os totais vêm do NPC.
- **Peça do mapa**: posição, direção e token; para NPCs e personagens, os dados exibidos vêm da ocorrência/participação ligada.
- **NPC da biblioteca**: fonte da ficha exibida na peça quando ela não tem ficha própria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos, um NPC colocado e alterado apenas pelas operações de ocorrência aparece na mesa com os mesmos nome, vida, energia e status que as listas externas devolvem — sem nenhuma gravação direta na peça.
- **SC-002**: A ficha de 100% das peças de NPC sem ficha própria mostra a ficha do NPC.
- **SC-003**: As mesas abertas mostram a alteração de uma ocorrência em até 5 segundos, sem recarregar.
- **SC-004**: Nenhuma regressão nas peças de personagem: todos os testes existentes continuam passando.
- **SC-005**: O relatório da correção descreve o caminho que exibia os dados crus, o que foi mudado e por quê.

## Clarifications

### Session 2026-09-28

- Q: Onde o 0/0 foi visto? → A: Não foi visto no app; o relato foi gerado por um assistente em outro repositório.
- Q: Onde fica a vida/energia atual do NPC? → A: Em cada ocorrência no mapa, com os totais vindos do NPC da biblioteca.

## Assumptions

- A ocorrência é a única dona dos dados exibidos de um NPC no mapa; os campos equivalentes da peça ficam sem efeito para peças de NPC (não é preciso limpá-los no banco).
- O movimento do NPC continua vindo do NPC da biblioteca, como já acontece.
- "Ficha própria" de uma peça de NPC é rara (só existe se alguém a gravou diretamente); quando existir, ela tem prioridade, como descrito no pedido.
