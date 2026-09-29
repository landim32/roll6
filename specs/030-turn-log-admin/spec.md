# Feature Specification: Administração do log de turnos (API e MCP)

**Feature Branch**: `030-turn-log-admin`
**Created**: 2026-09-29
**Status**: Draft
**Input**: User description: "Inclua metodos na API e MCP para alterar e excluir se necessário os logs dos turnos. Por API ou MCP pode incluir logs em turnos antigos e até definir e alterar qual é o turno atual. Essas funcionalidades não dever ir para o frontend"

## Contexto

Cada campanha tem um **turno atual** e um **log de turnos**: movimentos, ações, resultados de ações, alterações de
personagem/NPC e a narração do turno. Hoje o mestre já consegue incluir um registro direto (movimento, ação ou
resultado) e excluir um registro, mas **não consegue corrigir** um registro existente, **não consegue incluir
narração ou alteração de personagem** fora do processamento do turno, **não há limite claro** para o número do turno
informado e **o turno atual só avança** finalizando o turno (um de cada vez). Quando um assistente de IA ou o próprio
mestre erra ao processar um turno, ou quando uma sessão foi jogada fora da mesa e precisa ser registrada depois, não
há como arrumar o histórico.

Esta funcionalidade é **só para a API e o MCP** (assistentes de IA e integrações). Nenhuma tela nova ou botão novo no
frontend; o frontend apenas continua refletindo o que mudou (log, resumo, console, narração, número do turno) pelos
mecanismos que já existem.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Corrigir um registro de turno (Priority: P1)

O mestre (ou a IA com a chave de API dele) percebe que a narração do turno 7 saiu com um nome errado, que a ação de um
jogador foi registrada com o texto incompleto, ou que um movimento ficou com a posição final errada. Ele altera o
registro diretamente, informando o identificador do registro e os campos que quer mudar. O resumo, o histórico, o
console e a narração compartilhada passam a mostrar o texto corrigido.

**Why this priority**: É o pedido principal ("alterar os logs dos turnos") e hoje não existe forma de corrigir sem
excluir e recriar — o que ainda perde o autor e a data originais.

**Independent Test**: Criar uma ação no turno em andamento, alterar o texto dela pela API e conferir que a lista de
registros do turno e o resumo trazem o novo texto, com o mesmo identificador, autor e data de criação.

**Acceptance Scenarios**:

1. **Given** uma ação, resultado de ação ou narração em qualquer turno da campanha, **When** o mestre altera o texto, **Then** o registro guarda o novo texto e mantém identificador, tipo, autor, ator e data de criação.
2. **Given** um movimento registrado, **When** o mestre altera posição/sentido de antes ou de depois ou os pontos de movimento gastos, **Then** o registro guarda os novos valores e **nenhuma peça do mapa é movida**.
3. **Given** uma alteração de personagem/NPC registrada, **When** o mestre substitui a lista de campos alterados (campo, antes, depois), **Then** o registro guarda a nova lista; os valores atuais do personagem/NPC **não** mudam.
4. **Given** um registro qualquer, **When** o mestre informa outro número de turno entre 1 e o turno atual, **Then** o registro passa a pertencer a esse turno.
5. **Given** um jogador (mesmo o dono do personagem do registro) ou um usuário de fora da campanha, **When** tenta alterar, **Then** é recusado; registro inexistente responde "não encontrado".
6. **Given** um valor inválido (texto vazio ou longo demais, sentido fora de 0–5, pontos negativos, turno fora do intervalo, lista de alterações vazia), **When** o mestre altera, **Then** nada é gravado e o erro indica o campo.

---

### User Story 2 - Incluir registros em turnos antigos (Priority: P1)

A mesa jogou o turno 4 no papel, ou a IA esqueceu de registrar o resultado de uma ação do turno 3. O mestre inclui o
registro informando o número do turno (qualquer turno de 1 até o atual) e o tipo — agora também **narração** e
**alteração de personagem/NPC**, além de movimento, ação e resultado de ação. O registro aparece no resumo e no
histórico daquele turno.

**Why this priority**: Faz parte do pedido explícito ("incluir logs em turnos antigos") e completa a correção do
histórico junto com a US1.

**Independent Test**: Com a campanha no turno 6, incluir uma narração no turno 3 e conferir que a narração do turno 3
e o histórico de turnos passam a trazê-la, sem mexer no turno atual.

**Acceptance Scenarios**:

1. **Given** a campanha no turno 6, **When** o mestre inclui uma ação, resultado, movimento, narração ou alteração de personagem no turno 3, **Then** o registro é gravado no turno 3 com o mestre como autor.
2. **Given** a campanha no turno 6, **When** o mestre inclui um registro no turno 7 ou maior, ou no turno 0, **Then** é recusado (turnos futuros não recebem registros).
3. **Given** uma narração a incluir, **When** o mestre a envia, **Then** ela não tem personagem/NPC associado e o texto aceita o mesmo limite das narrações do processamento de turno.
4. **Given** um movimento incluído em um turno em que o personagem já se moveu, **When** o mestre o inclui, **Then** é aceito (a regra de um movimento por turno vale só para o jogo na mesa, não para a administração do log) e nenhuma peça é movida.
5. **Given** o registro de alteração de personagem/NPC, **When** o mestre o inclui, **Then** precisa informar o ator e pelo menos um campo alterado; os valores atuais do personagem/NPC não mudam.

---

### User Story 3 - Excluir registros de turno (Priority: P2)

O mestre exclui um registro duplicado ou equivocado de qualquer turno. A exclusão já existe; ela passa a ser documentada
e exposta como parte desta administração, valendo para qualquer tipo de registro (inclusive narração e alteração de
personagem) e para turnos antigos.

**Why this priority**: Já existe em grande parte; entra para garantir o comportamento completo em todos os tipos e
turnos.

**Independent Test**: Excluir a narração do turno 2 e conferir que a narração compartilhada do turno 2 deixa de
existir (resposta "sem conteúdo") e o histórico mostra o turno sem ela.

**Acceptance Scenarios**:

1. **Given** um registro de qualquer tipo em qualquer turno, **When** o mestre o exclui, **Then** ele desaparece do log, do resumo, do histórico e da narração; nenhuma peça volta de posição e nenhum valor de personagem/NPC é desfeito.
2. **Given** um não-mestre, **When** tenta excluir, **Then** é recusado.

---

### User Story 4 - Definir o turno atual (Priority: P2)

O mestre define diretamente qual é o turno atual da campanha: pode avançar vários turnos de uma vez (ex.: a mesa jogou
três turnos fora do sistema) ou voltar para um turno anterior (ex.: o turno foi finalizado por engano e precisa ser
reaberto).

**Why this priority**: Pedido explícito ("definir e alterar qual é o turno atual"), mas usado raramente — só para
consertar o estado da campanha.

**Independent Test**: Com a campanha no turno 5, definir o turno 8 e conferir que o estado do turno responde 8, que os
turnos 5 a 7 aparecem como finalizados no histórico (os que tiverem registros) e que os jogadores recebem o aviso de
turno finalizado.

**Acceptance Scenarios**:

1. **Given** a campanha no turno 5, **When** o mestre define o turno 8, **Then** o turno atual passa a 8 sem exigir ações pendentes, e os participantes são avisados como numa finalização de turno.
2. **Given** a campanha no turno 5 sem registros nos turnos 3 a 5, **When** o mestre define o turno 3, **Then** o turno atual passa a 3 e os participantes são avisados da mudança.
3. **Given** a campanha no turno 5 com registros no turno 4 ou 5, **When** o mestre define o turno 3 sem pedir o descarte, **Then** é recusado com conflito informando quais turnos posteriores têm registros.
4. **Given** o mesmo cenário, **When** o mestre define o turno 3 pedindo explicitamente o descarte dos registros posteriores, **Then** os registros dos turnos maiores que 3 são excluídos e o turno atual passa a 3, tudo de uma vez (ou nada muda).
5. **Given** um valor menor que 1, **When** o mestre tenta definir, **Then** é recusado; definir o mesmo valor atual não muda nada e não gera aviso.
6. **Given** um não-mestre, **When** tenta definir o turno, **Then** é recusado.

---

### User Story 5 - Tudo disponível para assistentes de IA (Priority: P1)

Cada operação acima (alterar registro, incluir em turno antigo com os novos tipos, excluir, definir turno atual) está
disponível como ferramenta do servidor MCP, com descrição em inglês no padrão das demais (o que faz, quem pode usar,
retorno, erros comuns, ferramentas relacionadas), marcando como destrutivas as que apagam ou reescrevem histórico, e o
guia do Roll6 explica quando usá-las.

**Why this priority**: O pedido é explícito sobre o MCP, e os assistentes de IA são o principal público.

**Independent Test**: Pelo MCP, com a chave do mestre, alterar a narração de um turno e definir o turno atual; conferir
pela API que os dados mudaram. Com a chave de um jogador, as mesmas ferramentas devolvem o erro de permissão da API.

**Acceptance Scenarios**:

1. **Given** um assistente com a chave do mestre, **When** usa as ferramentas, **Then** obtém os mesmos resultados e erros da API.
2. **Given** a verificação automática de cobertura do MCP, **When** roda, **Then** toda operação nova da API tem exatamente uma ferramenta correspondente.

### Edge Cases

- Alterar um registro de movimento **não** move a peça; se o mestre quiser mudar a posição real da peça, usa as operações de peça/processamento já existentes.
- Alterar o turno de um registro para um turno futuro (maior que o atual) é recusado.
- Um registro de movimento do turno em andamento, depois de excluído ou movido para outro turno, libera o personagem para mover de novo no turno em andamento (a regra de um movimento por turno olha os registros existentes).
- Registros de personagens, NPCs ou ocorrências que não pertencem à campanha são recusados na inclusão (o ator precisa ser da campanha: personagem com participação nela, NPC disponível nela, ocorrência em mapa dela).
- Narração não tem ator; tentar informar personagem/NPC para uma narração é recusado, e ações/movimentos/resultados/alterações sem ator continuam recusados.
- O tipo e o ator de um registro não mudam na alteração; para isso o mestre exclui e inclui de novo.
- Voltar o turno atual para um turno já finalizado reabre esse turno: os registros dele voltam a ser "do turno em andamento" (resumo, dados do turno, regra de um movimento por turno) e ele sai do histórico de turnos finalizados.
- Avançar o turno atual não cria registros nos turnos pulados; turnos sem registros não aparecem no histórico nem têm narração.
- Jogadores com o aviso "Turno N finalizado" já visto não recebem o aviso repetido quando o turno volta e avança de novo até o mesmo número (comportamento atual do frontend, sem mudança).
- Uma campanha excluída ou inexistente responde "não encontrado".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir ao mestre da campanha alterar um registro de turno existente, identificado pelo seu identificador, mantendo identificador, campanha, tipo, ator, autor e data de criação.
- **FR-002**: Os campos alteráveis MUST depender do tipo: texto (ação, resultado de ação, narração), posições/sentidos de antes e depois e pontos de movimento (movimento), lista de campos alterados (alteração de personagem/NPC), além do número do turno e do mapa em qualquer tipo. Campos não informados permanecem como estão.
- **FR-003**: Toda alteração MUST aplicar as mesmas validações da criação do mesmo tipo (limites de texto — ação/resultado até 2000 caracteres, narração até 10000 —, sentido 0–5, pontos não negativos, lista de alterações não vazia) e o número do turno MUST ficar entre 1 e o turno atual.
- **FR-004**: O sistema MUST permitir ao mestre incluir registros de todos os tipos — movimento, ação, resultado de ação, alteração de personagem/NPC e narração — em qualquer turno de 1 até o turno atual; turnos maiores que o atual ou menores que 1 MUST ser recusados.
- **FR-005**: Registros incluídos ou alterados por esta administração MUST NOT mover peças nem alterar vida, energia, status, anotações ou qualquer outro valor de personagens, participações, NPCs ou ocorrências — eles só mexem no log.
- **FR-006**: A inclusão administrativa MUST NOT aplicar a regra de um movimento por turno.
- **FR-007**: O ator informado na inclusão (personagem, NPC, ocorrência) MUST pertencer à campanha; do contrário a inclusão é recusada.
- **FR-008**: O sistema MUST permitir ao mestre excluir qualquer registro de qualquer turno, de qualquer tipo, sem desfazer efeitos no mapa ou nos personagens.
- **FR-009**: O sistema MUST permitir ao mestre definir o turno atual da campanha para qualquer número ≥ 1, sem a verificação de ações pendentes da finalização de turno.
- **FR-010**: Ao definir um turno atual menor que o atual, se existirem registros em turnos maiores que o novo valor, o sistema MUST recusar com conflito informando esses turnos, a menos que o mestre peça explicitamente o descarte; com o descarte, os registros desses turnos MUST ser excluídos e o turno atual alterado na mesma operação atômica.
- **FR-011**: Definir o turno atual com o mesmo valor MUST ser aceito sem efeito e sem aviso.
- **FR-012**: Toda inclusão, alteração ou exclusão de registro MUST avisar em tempo real os participantes da campanha que o log do turno mudou; avançar o turno atual MUST avisar como uma finalização de turno; voltar o turno MUST avisar que o turno mudou.
- **FR-013**: Somente o mestre da campanha MUST poder usar estas operações, autenticado por sessão ou por chave de API; jogadores (inclusive donos dos personagens dos registros) e usuários de fora MUST ser recusados.
- **FR-014**: Cada operação nova ou ampliada MUST estar disponível no servidor MCP como ferramenta que chama a API com a credencial do usuário, com descrição em inglês no padrão existente, anotada como destrutiva quando apaga ou reescreve histórico (alterar registro, excluir registro, definir turno atual), e o guia do Roll6 MUST mencionar as novas ferramentas.
- **FR-015**: O frontend MUST NOT ganhar telas, botões ou chamadas novas para estas operações; ele apenas reflete as mudanças pelos carregamentos e avisos que já existem.
- **FR-016**: As leituras existentes (registros do turno, resumo, dados do turno, histórico, narração) MUST refletir imediatamente as inclusões, alterações, exclusões e a mudança de turno atual.

### Key Entities

- **Registro de turno**: entrada do log de uma campanha — número do turno, tipo (movimento, ação, resultado de ação, alteração de personagem/NPC, narração), ator (personagem ou NPC/ocorrência; nenhum para narração), autor, mapa opcional, texto, posições/sentidos e pontos de movimento, lista de campos alterados, data de criação. Esta funcionalidade passa a permitir alterá-lo e incluí-lo em qualquer turno até o atual.
- **Turno atual da campanha**: número (≥ 1) do turno em andamento; os turnos menores são os finalizados. Esta funcionalidade permite ao mestre defini-lo diretamente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre corrige qualquer registro de qualquer turno com **uma** chamada, sem excluir e recriar, e 100% dos campos não informados permanecem iguais.
- **SC-002**: Um turno inteiro jogado fora da mesa pode ser registrado depois (movimentos, ações, resultados, alterações e narração) sem mudar o turno atual nem o estado do mapa.
- **SC-003**: O turno atual pode ser levado a qualquer número ≥ 1 com uma chamada, e em 100% dos casos de retrocesso com registros posteriores nada é perdido sem o pedido explícito de descarte.
- **SC-004**: 100% das operações novas estão disponíveis tanto pela API quanto pelo MCP com os mesmos resultados, e a verificação automática de cobertura do MCP passa.
- **SC-005**: Nenhuma operação desta funcionalidade é acessível por jogadores ou usuários de fora da campanha (0 casos aceitos nos testes de permissão).
- **SC-006**: Nenhuma mudança visível no frontend além dos dados atualizados (nenhum componente ou texto novo).

## Assumptions

- "Logs dos turnos" são os registros da tabela de turnos (movimento, ação, resultado de ação, alteração de personagem/NPC e narração).
- Quem administra o log é **somente o mestre** da campanha (as regras atuais de inclusão direta e exclusão já são só do mestre); a IA atua com a chave de API do mestre.
- A inclusão direta e a exclusão que já existem são reaproveitadas e ampliadas (novos tipos, limite de turno), mantendo compatibilidade com quem já as usa.
- O autor de um registro incluído administrativamente é o usuário que chamou (o mestre); a alteração não muda o autor nem a data de criação.
- Administrar o log é só corrigir o histórico: não recalcula nem reaplica efeitos no mapa ou nos personagens.
- Voltar o turno com registros posteriores exige descarte explícito para evitar perda acidental; não há opção de "mover" esses registros automaticamente (o mestre pode alterá-los um a um antes, se quiser mantê-los).
- Não há nova tabela nem nova coluna; só novas operações sobre o log e o turno atual existentes.
