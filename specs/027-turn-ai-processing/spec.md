# Feature Specification: Dados do turno e processamento do turno para IA

**Feature Branch**: `027-turn-ai-processing`
**Created**: 2026-09-28
**Status**: Draft
**Input**: User description: "Usando a mesma lógica que gera o texto em markdown do turno, crie dois métodos disponíveis na API e no MCP (sem frontend) para a IA processar todo o turno com poucas chamadas. Dados do Turno: dados básicos dos personagens (nome, jogador, vida atual/total, fadiga atual/total, status, X, Y, sentido), dos NPCs (nome, vida atual/total, fadiga atual/total, status, X, Y, sentido) e todas as ações no formato do texto em markdown. Processar o turno: gravar vida atual, fadiga atual, status, X, Y e sentido de personagens e NPCs na campanha e um texto descrevendo o que aconteceu no turno, gravado na tabela de turnos. Anotações do personagem e ficha continuam em chamadas à parte."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A IA lê o turno inteiro em uma chamada (Priority: P1)

Um assistente de IA ajuda o mestre a conduzir o combate. Para decidir o que aconteceu, ele precisa saber quem está
na mesa, como cada um está e o que cada um fez. Hoje isso exige várias consultas (grupo, NPCs, peças, registros do
turno). Com uma única chamada de **Dados do Turno** a IA recebe:

- cada **personagem** aprovado na campanha: nome, jogador, vida atual e total, fadiga (energia) atual e total, status,
  posição (coluna, linha) e para onde olha;
- cada **NPC** no mapa da mesa (cada ocorrência): nome, vida atual e total, fadiga atual e total, status, posição e
  para onde olha;
- todas as **ações** do turno, no mesmo texto legível do resumo do turno.

**Why this priority**: Sem os dados a IA não consegue processar o turno; é metade do objetivo.

**Independent Test**: Numa campanha com dois personagens, um NPC colocado duas vezes e algumas ações, uma única
chamada devolve os dois personagens, as duas ocorrências e as ações — e os valores batem com os de cada consulta
separada.

**Acceptance Scenarios**:

1. **Given** uma campanha com personagens aprovados e NPCs no mapa atual, **When** o mestre (ou a IA com a chave dele) pede os Dados do Turno, **Then** recebe a lista de personagens e de NPCs com todos os campos acima e as ações do turno em andamento.
2. **Given** um personagem aprovado sem peça no mapa atual, **When** pede os dados, **Then** ele aparece com vida/fadiga/status e sem posição.
3. **Given** um NPC colocado duas vezes, **When** pede os dados, **Then** aparecem duas entradas, cada uma com os valores da sua ocorrência e um identificador próprio.
4. **Given** um número de turno já finalizado, **When** pede os dados desse turno, **Then** as ações são as daquele turno (os valores dos personagens/NPCs são os atuais).
5. **Given** um participante aprovado que não é o mestre, **When** pede os dados, **Then** também recebe (mesma regra de leitura do turno); um usuário de fora é recusado.

---

### User Story 2 - A IA grava o resultado do turno em uma chamada (Priority: P1)

Depois de decidir o resultado (ex.: o goblin acertou Cedric; Cedric recuou um hex; o goblin fugiu), a IA envia uma
única chamada de **Processar o Turno** com:

- para cada personagem afetado: vida atual, fadiga atual, status, posição e sentido (só os campos que mudaram);
- para cada NPC afetado (ocorrência): os mesmos campos;
- um **texto narrando o que aconteceu no turno**, que fica registrado no histórico do turno.

Tudo é gravado de uma vez e o turno é finalizado em seguida: ou todas as alterações entram e o turno avança, ou nada
muda. Cada alteração fica registrada no turno com o
mestre como autor (mesmo registro de alterações já existente) e todos na mesa veem as mudanças na hora.

**Why this priority**: É a outra metade do objetivo; junto com a US1 forma o MVP.

**Independent Test**: Enviar vida 6 e status "Caído" para um personagem, nova posição para um NPC e um texto; a mesa
mostra os novos valores, a peça do NPC na nova posição, e o resumo do turno mostra as alterações e o texto.

**Acceptance Scenarios**:

1. **Given** o turno em andamento, **When** a IA envia alterações de dois personagens, um NPC e um texto, **Then** todas são gravadas, registradas no turno com o mestre como autor, e as telas abertas se atualizam.
2. **Given** uma alteração inválida (vida acima do total, posição fora do mapa ou ocupada, personagem que não está aprovado na campanha, NPC de outro mapa), **When** o lote é enviado, **Then** nada é gravado e a resposta indica qual item e qual campo está errado.
3. **Given** um item que só informa o status, **When** processado, **Then** só o status muda; os outros valores ficam como estavam.
4. **Given** o texto do turno, **When** processado, **Then** ele aparece no histórico e no resumo do turno em andamento.
5. **Given** um usuário que não é o mestre, **When** tenta processar, **Then** é recusado e nada muda.
6. **Given** uma mudança de posição, **When** processada, **Then** a peça vai para o hex e o sentido informados, sem a limitação de movimento dos jogadores (o mestre move livremente), e fica registrada no turno.
7. **Given** o processamento, **When** termina, **Then** o turno processado é **finalizado** e a campanha avança para o próximo turno (mesmo que algum personagem não tenha agido), com o mesmo aviso de "turno finalizado" que o botão do mestre já dispara.
8. **Given** um lote inválido, **When** recusado, **Then** o turno **não** é finalizado.

---

### User Story 3 - Resposta pronta para conferir (Priority: P2)

A resposta do processamento devolve os dados atualizados (no mesmo formato dos Dados do Turno), para a IA confirmar
o resultado sem uma nova consulta.

**Why this priority**: Reduz mais uma chamada; útil, mas não essencial.

**Independent Test**: A resposta do processamento é igual a uma chamada de Dados do Turno do turno processado feita logo depois.

**Acceptance Scenarios**:

1. **Given** um processamento bem-sucedido, **When** a resposta chega, **Then** traz personagens e NPCs atualizados e as ações do turno processado (incluindo as alterações e o texto recém-gravados), mais o número do novo turno.

---

### Edge Cases

- Lote vazio (sem alterações e sem texto): recusado com mensagem clara.
- Só o texto, sem alterações: permitido (registra a narração).
- Mesmo personagem ou NPC repetido no lote: recusado (ambíguo).
- Dois itens movendo peças para o mesmo hex, ou para o hex de uma peça que não se move: recusado.
- Troca de posição entre duas peças no mesmo lote (A vai para o hex de B e B para o de A): permitida, pois as posições são avaliadas depois de todas as mudanças.
- Vida ou fadiga zero ou negativa (caído): permitida para personagens e NPCs; nunca acima do total.
- Personagem sem peça no mapa atual e alteração de posição: recusado para esse item (não há peça para mover).
- Sem mapa atual na campanha: os dados listam personagens sem posição e nenhum NPC; alterações de posição são recusadas.
- Alterações que não mudam nada: não geram registro no turno.
- Anotações da campanha e a ficha do personagem não fazem parte destes métodos (continuam nos métodos próprios).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE oferecer um método **Dados do Turno**, disponível na API e no MCP, que devolve numa única resposta os personagens aprovados da campanha, as ocorrências de NPC do mapa atual e as ações do turno.
- **FR-002**: Para cada personagem, DEVE devolver: identificador, nome, jogador, vida atual e total, fadiga (energia) atual e total, status e, se tiver peça no mapa atual, coluna, linha e sentido (com o nome da direção).
- **FR-003**: Para cada ocorrência de NPC, DEVE devolver: identificador da ocorrência, nome, vida atual e total, fadiga atual e total, status, coluna, linha e sentido.
- **FR-004**: As ações DEVEM vir no mesmo texto legível do resumo do turno já existente (mesmas regras de escrita).
- **FR-005**: Sem número de turno informado, DEVE usar o turno em andamento; com número, as ações daquele turno.
- **FR-006**: Dados do Turno DEVE seguir a regra de leitura do turno (mestre ou participante aprovado).
- **FR-007**: O sistema DEVE oferecer um método **Processar o Turno**, disponível na API e no MCP, que recebe numa única chamada alterações de personagens e de ocorrências de NPC (vida atual, fadiga atual, status, coluna, linha, sentido — cada campo opcional) e um texto do que aconteceu no turno.
- **FR-008**: Processar o Turno DEVE ser restrito ao mestre da campanha.
- **FR-009**: Processar o Turno DEVE ser atômico: se qualquer item for inválido, nada é gravado e a resposta aponta o item e o campo com erro.
- **FR-010**: As validações DEVEM ser as mesmas das alterações individuais (vida/fadiga atual nunca acima do total, status até o limite atual, posição dentro do mapa e livre), avaliando as posições depois de todas as mudanças do lote.
- **FR-011**: Cada alteração efetiva DEVE ser registrada no turno em andamento com o mestre como autor, como as alterações individuais já são; mudanças de posição DEVEM ficar registradas com origem e destino.
- **FR-012**: O texto DEVE ser gravado no histórico do turno em andamento como uma narração do turno (sem estar ligado a um personagem ou NPC) e aparecer no resumo do turno.
- **FR-013**: As telas abertas da mesa DEVEM refletir as alterações sem recarregar.
- **FR-014**: A resposta do processamento DEVE devolver os dados atualizados no mesmo formato de Dados do Turno, referentes ao turno processado (com as alterações e a narração), e o número do novo turno em andamento.
- **FR-016**: Depois de gravar, Processar o Turno DEVE finalizar o turno processado e avançar a campanha para o próximo, sem exigir que todos os personagens tenham agido, disparando o mesmo aviso de turno finalizado; se o lote for recusado, o turno não avança.
- **FR-015**: Anotações da campanha e ficha do personagem NÃO fazem parte destes métodos.

### Key Entities

- **Dados do Turno**: fotografia da mesa — personagens, ocorrências de NPC e o texto das ações de um turno.
- **Lote de processamento**: alterações de personagens e de ocorrências + texto do turno, aplicados juntos.
- **Narração do turno**: novo tipo de registro no histórico do turno, com o texto e o autor, sem personagem/NPC.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um assistente lê o estado completo da mesa e o que aconteceu no turno com 1 chamada (antes: 4 ou mais).
- **SC-002**: Um assistente grava o resultado de um turno com até 10 personagens/NPCs afetados e fecha o turno em 1 chamada.
- **SC-003**: Em 100% dos lotes com um item inválido, nenhuma alteração é gravada.
- **SC-004**: Os valores devolvidos pelos Dados do Turno são idênticos aos das consultas individuais em 100% dos casos.
- **SC-005**: As mesas abertas mostram as alterações de um lote em até 5 segundos.

## Clarifications

### Session 2026-09-28

- Q: Processar o turno também o finaliza? → A: Sim, sempre — grava tudo e avança para o próximo turno (mesmo com pendências).

## Assumptions

- "Fadiga" é a energia do sistema (os nomes técnicos continuam os atuais).
- O mapa usado para NPCs e posições é o mapa atual da campanha (o que os jogadores acompanham).
- As mudanças de posição feitas pelo processamento são do mestre: não sofrem a regra de "um movimento por turno" nem o limite de pontos de movimento, mas ficam registradas.
- O texto do turno aceita até 10.000 caracteres (uma narração é maior que uma ação, que continua com 2.000).
- Sem frontend nesta funcionalidade; o resumo do turno já existente passa a mostrar a narração.
