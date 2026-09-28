# Feature Specification: Registro completo do turno e resumo em markdown

**Feature Branch**: `024-turn-log-summary`
**Created**: 2026-09-28
**Status**: Draft
**Input**: User description: "Qualquer alteração no personagem deve ser incluida no Turn: campo UserId (quem fez, obrigatório); TurnType CharacterUpdate para qualquer alteração; campo Moved com os pontos de movimento gastos; método que transforme tudo o que ocorreu no turno em um texto legível em markdown (seções Ações e Posições); ao clicar no número do turno no rodapé, exibir um modal com esse texto para copiar"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toda alteração fica registrada no turno, com autor (Priority: P1)

Durante o turno, o mestre e os jogadores mudam os personagens: o mestre baixa a vida de Cedric após um golpe, o
jogador altera o status do próprio personagem, alguém corrige a energia. Hoje só movimentos e ações ficam no
registro do turno; essas alterações se perdem. A partir de agora **cada alteração** vira um registro do tipo
"Alteração de personagem" no turno em andamento, guardando **o que mudou** (valor antigo → valor novo) e **quem
fez** (o mestre ou o dono do personagem). Todo registro do turno — movimento, ação, resultado ou alteração — passa a
guardar obrigatoriamente o usuário que o fez, e os movimentos passam a guardar quantos pontos de movimento foram
gastos.

**Why this priority**: Sem os dados registrados não há o que resumir; é a base das outras histórias.

**Independent Test**: Numa campanha com um personagem aprovado, o mestre muda a vida e o status dele e o jogador
move a peça; o registro do turno mostra a alteração (com valores antes/depois e o mestre como autor) e o movimento
(com o jogador como autor e os pontos gastos).

**Acceptance Scenarios**:

1. **Given** um personagem aprovado na campanha, **When** o mestre muda a vida atual de 10 para 6, **Then** o turno em andamento ganha um registro "Alteração de personagem" desse personagem com "Vida: 10 → 6" e o mestre como autor.
2. **Given** o mesmo personagem, **When** o dono muda energia e status numa única gravação, **Then** um único registro reúne as duas mudanças, com o dono como autor.
3. **Given** uma gravação que não muda nenhum valor, **When** é salva, **Then** nenhum registro é criado.
4. **Given** uma peça movida, **When** o movimento é gravado, **Then** o registro guarda o autor e os pontos de movimento gastos (o mesmo custo calculado para o movimento: passos + giros de 60°).
5. **Given** uma ação ou um resultado registrado, **When** consultado, **Then** mostra quem o fez.
6. **Given** uma ocorrência de NPC no mapa alterada pelo mestre, **When** salva, **Then** também gera "Alteração de personagem" para aquele NPC.

---

### User Story 2 - Resumo do turno em markdown (Priority: P1)

O mestre quer colar o que aconteceu no turno num chat, num diário de campanha ou passar para um assistente de IA.
O sistema gera, para qualquer turno, um texto em markdown legível com duas seções: **Ações** (tudo o que ocorreu,
na ordem em que ocorreu) e **Posições** (onde cada peça de personagem/NPC está e para onde olha).

**Why this priority**: É o produto visível da funcionalidade; junto com a US1 forma o MVP.

**Independent Test**: Com um turno contendo um movimento, uma alteração e uma ação, o texto gerado é idêntico ao
formato de exemplo abaixo (com os nomes e valores do turno).

Formato esperado:

```
## Ações
Cedric (José): Moveu de (2, 11) olhando para o Sudoeste para (2, 12) olhando para o Sul, gastou 3 pontos de movimento (3)
GM (Rodrigo): Alterou Cedric (José): Vida de 10 para 6; Energia de 8 para 5; Status de "-1 de redutor de dano no próximo turno" para "Agachado"
Comam (Rodrigo): "Vou largar minha picareta e fazer um saque rápido da minha espada"
## Posições
- Cedric (José) - (2, 12) - Sul
- Comam (Rodrigo) - (3, 13) - Nordeste
- Goblin (GM) - (5, 11) - Sudeste
```

**Acceptance Scenarios**:

1. **Given** um movimento, **When** o texto é gerado, **Then** a linha diz de onde para onde (coluna, linha), a direção antes e depois em português (Norte, Nordeste, Sudeste, Sul, Sudoeste, Noroeste) e os pontos gastos, com o total gasto pelo personagem no turno entre parênteses.
2. **Given** uma alteração, **When** o texto é gerado, **Then** a linha começa pelo autor ("GM (nome do mestre)" quando foi o mestre, "Personagem (dono)" quando foi o dono) e lista cada campo alterado "de X para Y", separados por ";".
3. **Given** uma ação, **When** o texto é gerado, **Then** a linha traz o personagem e a fala entre aspas; resultados do mestre aparecem como "GM (nome): Resultado para Personagem: texto".
4. **Given** personagens e NPCs com peça no mapa do turno, **When** o texto é gerado, **Then** a seção Posições lista cada um com (coluna, linha) e direção; NPCs aparecem como "Nome (GM)"; objetos não aparecem.
5. **Given** um pedido de resumo sem número de turno, **When** o texto é gerado, **Then** é o do último turno da campanha (o turno em andamento).
6. **Given** um turno sem nenhum registro, **When** o texto é gerado, **Then** a seção Ações diz "Nenhuma ação registrada." e as posições continuam listadas.
7. **Given** o turno em andamento, **When** gerado, **Then** as posições são as atuais; **Given** um turno já finalizado, **Then** as posições são as do fim daquele turno (último movimento registrado até ele, ou a posição atual para quem não se moveu desde então).

---

### User Story 3 - Copiar o resumo pelo rodapé (Priority: P2)

Na mesa, o mestre clica em "Turno N" no rodapé do mapa e um modal mostra o resumo em markdown do turno com um botão
"Copiar". Os jogadores aprovados também podem abrir o resumo.

**Why this priority**: Facilita o uso, mas depende das histórias anteriores.

**Independent Test**: Clicar em "Turno N" abre o modal com o texto; "Copiar" coloca o texto na área de transferência
e confirma com um aviso.

**Acceptance Scenarios**:

1. **Given** a mesa aberta, **When** o mestre ou um participante aprovado clica em "Turno N", **Then** abre um modal com o resumo do turno N em texto (markdown sem formatação) e o botão "Copiar".
2. **Given** o modal aberto, **When** clica em "Copiar", **Then** o texto vai para a área de transferência e aparece "Resumo copiado".
3. **Given** o modal aberto, **When** algo muda no turno (movimento, alteração, ação), **Then** o texto se atualiza.
4. **Given** o modal, **When** o usuário escolhe um turno anterior, **Then** vê o resumo daquele turno.

---

### Edge Cases

- Registros antigos, criados antes desta funcionalidade, não têm autor: recebem como autor o dono do personagem (registros de personagem) ou o mestre da campanha (NPCs e resultados), para que o autor possa ser obrigatório. Movimentos antigos ficam sem pontos gastos e o texto omite essa parte.
- Mestre que também é dono do personagem: quando o autor é o dono do personagem, a linha usa o nome do personagem ("Cedric (Rodrigo)"); "GM (nome)" só aparece quando o autor é o mestre alterando o personagem de outra pessoa ou um NPC.
- "Resetar turno" continua apagando apenas os movimentos e ações daquele personagem/NPC; as alterações de personagem permanecem (são histórico do que aconteceu).
- Alterações de personagem não contam como a ação do turno: não mudam a lista de pendentes ao finalizar o turno.
- Alterar os totais do próprio personagem (fora da campanha) gera um registro no turno em andamento de cada campanha em que ele está aprovado.
- Personagem excluído ou removido da campanha: seus registros saem junto (regra atual); o resumo de turnos passados não os mostra.
- Nomes com caracteres de markdown são escritos como texto (sem virar formatação).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo registro de turno DEVE guardar, obrigatoriamente, o usuário que o originou.
- **FR-002**: O sistema DEVE ter um novo tipo de registro "Alteração de personagem" (CharacterUpdate).
- **FR-003**: Toda gravação que mude valores de um personagem na campanha (vida atual, energia atual, status, anotações da campanha) ou de uma ocorrência de NPC no mapa (nome, vida, energia, status) DEVE gerar um registro "Alteração de personagem" no turno em andamento, com a lista de campos alterados (valor anterior e novo) e o autor.
- **FR-004**: Mudanças nos dados do próprio personagem feitas pelo dono (nome, vida/energia totais, movimento) DEVEM gerar o registro em cada campanha em que o personagem está aprovado.
- **FR-005**: Uma gravação sem mudança efetiva NÃO DEVE gerar registro; várias mudanças numa mesma gravação DEVEM gerar um único registro.
- **FR-006**: Registros de movimento DEVEM guardar os pontos de movimento gastos, calculados da mesma forma que o custo do movimento (passos + giros de 60°); movimentos livres do mestre também guardam o custo do caminho.
- **FR-007**: O sistema DEVE gerar, para qualquer turno de uma campanha (quando o turno não for informado, o último turno da campanha — o turno em andamento), um texto em markdown com as seções "Ações" (registros em ordem cronológica, no formato da US2) e "Posições" (peças de personagem e NPC do mapa do turno, com coordenadas e direção em português).
- **FR-008**: O resumo DEVE estar disponível para o mestre e os participantes aprovados da campanha (as mesmas pessoas que já leem o turno), e também para assistentes/ferramentas externas (MCP e chaves de API).
- **FR-009**: Ao clicar no número do turno no rodapé, o sistema DEVE abrir um modal com o resumo do turno atual, um seletor de turnos anteriores e o botão "Copiar".
- **FR-010**: O modal DEVE se atualizar quando o turno mudar enquanto estiver aberto.

### Key Entities

- **Registro de turno**: ganha **autor** (usuário, obrigatório), **pontos de movimento gastos** (movimentos) e o novo tipo **Alteração de personagem**, que guarda a lista de mudanças (campo, valor anterior, valor novo).
- **Resumo do turno**: texto gerado (não armazenado) a partir dos registros e das posições das peças.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das alterações de vida, energia, status ou anotações feitas durante um turno aparecem no resumo desse turno, com autor e valores antes/depois.
- **SC-002**: O mestre obtém o resumo de um turno e o copia em no máximo 2 cliques a partir da mesa.
- **SC-003**: O resumo de um turno com até 50 registros aparece em menos de 1 segundo.
- **SC-004**: O texto copiado, colado num editor de markdown, mostra as duas seções corretamente sem nenhum ajuste manual.

## Assumptions

- Direções em português pelo lado da peça: 0 Norte, 1 Nordeste, 2 Sudeste, 3 Sul, 4 Sudoeste, 5 Noroeste (o hexágono de topo plano não tem Leste/Oeste).
- No exemplo "gastou 3 pontos a mais de movimento (3)", o primeiro número é o custo daquele movimento e o número entre parênteses é o total gasto pelo personagem/NPC no turno.
- "Fadiga" do exemplo corresponde à "Energia" do sistema; os rótulos seguem os nomes já usados na interface.
- As anotações da campanha aparecem no resumo apenas como "Anotações alteradas" (sem o texto completo), para não poluir o resumo.
- "Último turno" é o turno em andamento da campanha (o maior número de turno); para ver o último turno finalizado basta informar o número dele.
- O resumo é gerado sob demanda; nada novo é armazenado além dos campos dos registros.
